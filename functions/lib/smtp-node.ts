import net from "node:net";
import tls from "node:tls";
import { randomUUID } from "node:crypto";
import type { OutboundEmailPayload } from "./lead-engine.js";

/**
 * Zero-dependency Direct Mailbox ESMTP client (`smtp.protonmail.ch:587` STARTTLS or `:465` implicit TLS).
 *
 * Security & reliability invariants:
 *   1. ALL-OR-NOTHING CONFIG: `SMTP_USER`, `SMTP_PASSWORD`, and `BOOKING_NOTIFY_EMAIL` must all three
 *      be configured together, or all three left unset. Partial configs throw immediately.
 *   2. MANDATORY TLS BEFORE AUTH: On port 587 (`starttls`), `AUTH PLAIN`/`AUTH LOGIN` is never sent
 *      until the server advertises `STARTTLS` and completes a verified TLS >= 1.2 handshake.
 *   3. ZERO REFLECTION / OPEN RELAY: `RCPT TO` is strictly `cfg.notifyEmail` (`BOOKING_NOTIFY_EMAIL`),
 *      never visitor-controlled input. Applicant email is placed only in sanitized `Reply-To`.
 */

const EMAIL_ADDRESS_RE = /^[a-z0-9._%+-]+@([a-z0-9-]+\.)+[a-z]{2,24}$/i;
const HEADER_UNSAFE_RE = /[\r\n\0\u202a-\u202e\u2066-\u2069]/;
const HOSTNAME_RE = /^[a-z0-9.-]+$/i;
const PLACEHOLDER_RE = /(?:^din@epost\.no$|^changeme$|^your[_-]|<token>|@example\.com$|onboarding@resend\.dev)/i;
const DEFAULT_SMTP_TIMEOUT_MS = 8_000;

export type SmtpTlsMode = "starttls" | "implicit";

export interface ResolvedSmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly tlsMode: SmtpTlsMode;
  readonly user: string;
  readonly password: string;
  readonly notifyEmail: string;
  readonly fromHeader: string;
  readonly fromAddress: string;
  readonly fromDomain: string;
}

interface SmtpReply {
  readonly code: number;
  readonly lines: string[];
}

function extractDomain(email: string): string {
  const atIndex = email.lastIndexOf("@");
  return atIndex === -1 ? "byggflyt.no" : email.slice(atIndex + 1).toLowerCase();
}

function parseFromHeader(
  rawFrom: string | undefined,
  defaultUser: string,
  expectedDomain: string
): { fromHeader: string; fromAddress: string } {
  const trimmed = rawFrom?.trim() ?? "";
  if (!trimmed || PLACEHOLDER_RE.test(trimmed)) {
    return {
      fromHeader: `ByggFlyt <${defaultUser}>`,
      fromAddress: defaultUser
    };
  }
  if (HEADER_UNSAFE_RE.test(trimmed)) {
    throw new Error("[smtp] EMAIL_FROM contains illegal control or bidi characters.");
  }

  const angleMatch = /^([^<>]+?)<([^<>]+)>$/.exec(trimmed);
  if (angleMatch) {
    const rawDisplay = angleMatch[1]?.trim().replace(/^"|"$/g, "").trim() ?? "";
    const displayName = rawDisplay.length > 0 ? rawDisplay : "ByggFlyt";
    const addr = angleMatch[2]?.trim().toLowerCase() ?? "";
    if (!EMAIL_ADDRESS_RE.test(addr)) {
      throw new Error(`[smtp] EMAIL_FROM address "${addr}" is not a valid email address.`);
    }
    if (extractDomain(addr) !== expectedDomain) {
      throw new Error(
        `[smtp] EMAIL_FROM domain ("${extractDomain(addr)}") must match SMTP_USER domain ("${expectedDomain}") for SPF/DKIM alignment.`
      );
    }
    const safeDisplay = /^[a-zA-Z0-9 æøåÆØÅ._-]+$/.test(displayName)
      ? displayName
      : `"${displayName.replace(/["\\]/g, "")}"`;
    return {
      fromHeader: `${safeDisplay} <${addr}>`,
      fromAddress: addr
    };
  }

  const bare = trimmed.toLowerCase();
  if (!EMAIL_ADDRESS_RE.test(bare)) {
    throw new Error(
      `[smtp] EMAIL_FROM "${trimmed}" must be "ByggFlyt <addr@${expectedDomain}>" or "addr@${expectedDomain}".`
    );
  }
  if (extractDomain(bare) !== expectedDomain) {
    throw new Error(
      `[smtp] EMAIL_FROM domain ("${extractDomain(bare)}") must match SMTP_USER domain ("${expectedDomain}").`
    );
  }
  return {
    fromHeader: `ByggFlyt <${bare}>`,
    fromAddress: bare
  };
}

/**
 * Resolves and validates the Direct Mailbox SMTP configuration from `env`.
 * Returns `null` when `SMTP_USER`, `SMTP_PASSWORD`, and `BOOKING_NOTIFY_EMAIL` are all unset;
 * throws on any partial or invalid configuration.
 */
export function resolveSmtpConfig(
  env: Record<string, string | undefined> = process.env
): ResolvedSmtpConfig | null {
  const user = env["SMTP_USER"]?.trim() ?? "";
  const password = env["SMTP_PASSWORD"]?.trim() ?? "";
  const rawNotify = (env["BOOKING_NOTIFY_EMAIL"] ?? env["LEAD_NOTIFY_EMAIL"] ?? "").trim();

  // Only treat LEAD_NOTIFY_EMAIL as active for SMTP if SMTP_USER or SMTP_PASSWORD or BOOKING_NOTIFY_EMAIL is set
  const explicitBookingNotify = env["BOOKING_NOTIFY_EMAIL"]?.trim() ?? "";
  const notifyEmail =
    explicitBookingNotify.length > 0
      ? explicitBookingNotify
      : user.length > 0 || password.length > 0
        ? rawNotify
        : "";

  const coreEntries: Array<[string, string]> = [
    ["SMTP_USER", user],
    ["SMTP_PASSWORD", password],
    ["BOOKING_NOTIFY_EMAIL", notifyEmail]
  ];
  const populated = coreEntries.filter(([, val]) => val.length > 0).map(([key]) => key);

  if (populated.length === 0) {
    return null;
  }

  if (populated.length < coreEntries.length) {
    const missing = coreEntries.filter(([, val]) => val.length === 0).map(([key]) => key);
    throw new Error(
      `[smtp] Partial SMTP configuration: set SMTP_USER, SMTP_PASSWORD, and BOOKING_NOTIFY_EMAIL together, or leave all three unset (set: ${populated.join(", ")}; missing: ${missing.join(", ")}).`
    );
  }

  const normalizedUser = user.toLowerCase();
  if (
    HEADER_UNSAFE_RE.test(normalizedUser) ||
    PLACEHOLDER_RE.test(normalizedUser) ||
    !EMAIL_ADDRESS_RE.test(normalizedUser)
  ) {
    throw new Error(`[smtp] Invalid SMTP_USER "${user}": expected a real mailbox address.`);
  }

  if (PLACEHOLDER_RE.test(password) || HEADER_UNSAFE_RE.test(password)) {
    throw new Error("[smtp] Invalid SMTP_PASSWORD: placeholder or control characters detected.");
  }

  const normalizedNotify = notifyEmail.toLowerCase();
  if (
    HEADER_UNSAFE_RE.test(normalizedNotify) ||
    PLACEHOLDER_RE.test(normalizedNotify) ||
    !EMAIL_ADDRESS_RE.test(normalizedNotify)
  ) {
    throw new Error(
      `[smtp] Invalid BOOKING_NOTIFY_EMAIL "${notifyEmail}": expected a real destination mailbox address.`
    );
  }

  const host = (env["SMTP_HOST"]?.trim() || "smtp.protonmail.ch").toLowerCase();
  if (!HOSTNAME_RE.test(host)) {
    throw new Error(`[smtp] Invalid SMTP_HOST "${host}".`);
  }

  const rawPort = env["SMTP_PORT"]?.trim() || "587";
  if (!/^\d{1,5}$/.test(rawPort)) {
    throw new Error(`[smtp] Invalid SMTP_PORT "${rawPort}": expected TCP port 1-65535.`);
  }
  const port = Number.parseInt(rawPort, 10);
  if (port < 1 || port > 65_535) {
    throw new Error(`[smtp] Invalid SMTP_PORT "${rawPort}": expected TCP port 1-65535.`);
  }

  const tlsMode: SmtpTlsMode = port === 465 ? "implicit" : "starttls";
  const fromDomain = extractDomain(normalizedUser);
  const { fromHeader, fromAddress } = parseFromHeader(
    env["EMAIL_FROM"] ?? env["LEAD_FROM_EMAIL"],
    normalizedUser,
    fromDomain
  );

  return {
    host,
    port,
    tlsMode,
    user: normalizedUser,
    password,
    notifyEmail: normalizedNotify,
    fromHeader,
    fromAddress,
    fromDomain
  };
}

function encodeRfc2047Subject(subject: string): string {
  const clean = subject.replace(/[\r\n\0]+/g, " ").trim().slice(0, 180);
  return `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

function wrapBase64Utf8(text: string): string {
  const b64 = Buffer.from(text.slice(0, 24_000), "utf8").toString("base64");
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 76) {
    lines.push(b64.slice(i, i + 76));
  }
  return lines.join("\r\n");
}

function stripHeaderUnsafe(value: string, maxLen = 64): string {
  return value.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, " ").trim().slice(0, maxLen);
}

function sanitizeReplyTo(rawReplyTo: string | undefined): string | null {
  if (!rawReplyTo) return null;
  const candidate = rawReplyTo.trim().toLowerCase();
  if (!candidate || HEADER_UNSAFE_RE.test(candidate) || !EMAIL_ADDRESS_RE.test(candidate)) {
    return null;
  }
  return candidate;
}

export function buildSmtpMimeMessage(
  payload: OutboundEmailPayload,
  cfg: ResolvedSmtpConfig
): { rawMime: string; messageId: string } {
  const messageId = `<${randomUUID()}@${cfg.fromDomain}>`;
  const safeReplyTo = sanitizeReplyTo(payload.replyTo);

  const headers: string[] = [
    `From: ${cfg.fromHeader}`,
    `To: <${cfg.notifyEmail}>`,
    ...(safeReplyTo ? [`Reply-To: <${safeReplyTo}>`] : []),
    `Subject: ${encodeRfc2047Subject(payload.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    "Auto-Submitted: auto-generated",
    "X-Auto-Response-Suppress: All",
    `X-ByggFlyt-Kind: ${stripHeaderUnsafe(payload.kind, 32)}`,
    `X-ByggFlyt-Ref: ${stripHeaderUnsafe(payload.referenceId, 40)}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64"
  ];

  const bodyB64 = wrapBase64Utf8(payload.text);
  const rawMime = `${headers.join("\r\n")}\r\n\r\n${bodyB64}\r\n`;
  return { rawMime, messageId };
}

function attachSmtpProtocol(socket: net.Socket): {
  readReply: () => Promise<SmtpReply>;
  command: (line: string, expectedCodes: number[], redactLabel?: string) => Promise<SmtpReply>;
  detach: () => void;
} {
  let buffer = "";
  let currentLines: string[] = [];
  let waiter: { resolve: (r: SmtpReply) => void; reject: (e: Error) => void } | null = null;
  const queued: SmtpReply[] = [];
  let fatalErr: Error | null = null;

  const fail = (err: unknown): void => {
    fatalErr = err instanceof Error ? err : new Error(String(err));
    if (waiter) {
      const activeWaiter = waiter;
      waiter = null;
      activeWaiter.reject(fatalErr);
    }
  };

  const onData = (chunk: Buffer): void => {
    buffer += chunk.toString("utf8");
    let idx = buffer.indexOf("\n");
    while (idx !== -1) {
      const line = buffer.slice(0, idx).replace(/\r$/, "");
      buffer = buffer.slice(idx + 1);
      currentLines.push(line);
      const match = /^(\d{3})([ -])(.*)$/.exec(line);
      if (match && match[2] === " ") {
        const reply: SmtpReply = {
          code: Number.parseInt(match[1] ?? "0", 10),
          lines: currentLines
        };
        currentLines = [];
        if (waiter) {
          const activeWaiter = waiter;
          waiter = null;
          activeWaiter.resolve(reply);
        } else {
          queued.push(reply);
        }
      }
      idx = buffer.indexOf("\n");
    }
  };

  const onError = (err: Error): void => fail(err);
  const onClose = (): void => fail(new Error("SMTP socket closed unexpectedly."));

  socket.on("data", onData);
  socket.on("error", onError);
  socket.on("close", onClose);

  return {
    readReply(): Promise<SmtpReply> {
      const next = queued.shift();
      if (next) return Promise.resolve(next);
      if (fatalErr) return Promise.reject(fatalErr);
      return new Promise<SmtpReply>((resolve, reject) => {
        waiter = { resolve, reject };
      });
    },
    async command(line: string, expectedCodes: number[], redactLabel?: string): Promise<SmtpReply> {
      socket.write(`${line}\r\n`);
      const reply = await this.readReply();
      if (!expectedCodes.includes(reply.code)) {
        const verb = redactLabel ?? line.split(" ")[0] ?? "CMD";
        throw new Error(`SMTP ${verb} failed (${reply.code}): ${reply.lines.join(" | ")}`);
      }
      return reply;
    },
    detach(): void {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    }
  };
}

async function openAuthenticatedSession(cfg: ResolvedSmtpConfig): Promise<{
  socket: net.Socket;
  session: ReturnType<typeof attachSmtpProtocol>;
  banner: string;
  tlsUpgraded: boolean;
}> {
  const sniServername = net.isIP(cfg.host) ? "localhost" : cfg.host;

  let socket: net.Socket;
  let tlsUpgraded = false;

  if (cfg.tlsMode === "implicit") {
    socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
      const secureSocket = tls.connect(
        {
          host: cfg.host,
          port: cfg.port,
          servername: sniServername,
          minVersion: "TLSv1.2",
          rejectUnauthorized: true
        },
        () => resolve(secureSocket)
      );
      secureSocket.once("error", reject);
    });
    tlsUpgraded = true;
  } else {
    socket = await new Promise<net.Socket>((resolve, reject) => {
      const plainSocket = net.createConnection({ host: cfg.host, port: cfg.port }, () =>
        resolve(plainSocket)
      );
      plainSocket.once("error", reject);
    });
  }

  let session = attachSmtpProtocol(socket);
  try {
    const greeting = await session.readReply();
    if (greeting.code !== 220) {
      throw new Error(`Unexpected SMTP greeting (${greeting.code}): ${greeting.lines.join(" ")}`);
    }
    const banner = greeting.lines[0] ?? "";
    const ehloDomain = HOSTNAME_RE.test(cfg.fromDomain) ? cfg.fromDomain : "byggflyt.no";

    let ehlo = await session.command(`EHLO ${ehloDomain}`, [250]);

    if (cfg.tlsMode === "starttls") {
      const advertisesStartTls = ehlo.lines.some((line) => /\bSTARTTLS\b/i.test(line));
      if (!advertisesStartTls) {
        throw new Error(
          `SMTP server ${cfg.host}:${cfg.port} did not advertise STARTTLS; refusing cleartext AUTH.`
        );
      }

      await session.command("STARTTLS", [220]);
      session.detach();
      const plainSocket = socket;
      socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
        const upgraded = tls.connect(
          {
            socket: plainSocket,
            servername: sniServername,
            minVersion: "TLSv1.2",
            rejectUnauthorized: true
          },
          () => resolve(upgraded)
        );
        upgraded.once("error", reject);
      });
      tlsUpgraded = true;
      session = attachSmtpProtocol(socket);
      ehlo = await session.command(`EHLO ${ehloDomain}`, [250]);
    }

    const authLine = ehlo.lines.find((line) => /\bAUTH\b/i.test(line)) ?? "";
    if (/\bPLAIN\b/i.test(authLine) || !/\bLOGIN\b/i.test(authLine)) {
      const token = Buffer.from(`\0${cfg.user}\0${cfg.password}`, "utf8").toString("base64");
      await session.command(`AUTH PLAIN ${token}`, [235], "AUTH PLAIN");
    } else {
      await session.command("AUTH LOGIN", [334], "AUTH LOGIN");
      await session.command(Buffer.from(cfg.user, "utf8").toString("base64"), [334], "AUTH USER");
      await session.command(
        Buffer.from(cfg.password, "utf8").toString("base64"),
        [235],
        "AUTH PASS"
      );
    }

    return { socket, session, banner, tlsUpgraded };
  } catch (err) {
    session.detach();
    socket.destroy();
    throw err;
  }
}

export async function verifySmtpConnection(
  cfg: ResolvedSmtpConfig,
  timeoutMs = DEFAULT_SMTP_TIMEOUT_MS
): Promise<{ banner: string; tlsUpgraded: boolean; authOk: true }> {
  const holder: { socket: net.Socket | null } = { socket: null };

  const timerPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      holder.socket?.destroy();
      reject(new Error(`SMTP probe timed out after ${timeoutMs}ms (${cfg.host}:${cfg.port})`));
    }, timeoutMs);
    timer.unref();
  });

  const probe = async (): Promise<{ banner: string; tlsUpgraded: boolean; authOk: true }> => {
    const conn = await openAuthenticatedSession(cfg);
    holder.socket = conn.socket;
    await conn.session.command("QUIT", [221]).catch((): null => null);
    conn.session.detach();
    conn.socket.destroy();
    return { banner: conn.banner, tlsUpgraded: conn.tlsUpgraded, authOk: true };
  };

  try {
    return await Promise.race([probe(), timerPromise]);
  } finally {
    holder.socket?.destroy();
  }
}

export async function sendSmtpMessage(
  payload: OutboundEmailPayload,
  cfg: ResolvedSmtpConfig,
  timeoutMs = DEFAULT_SMTP_TIMEOUT_MS
): Promise<{ messageId: string; smtpResponse: string }> {
  const { rawMime, messageId } = buildSmtpMimeMessage(payload, cfg);
  const dotStuffed = rawMime
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");

  const holder: { socket: net.Socket | null } = { socket: null };

  const timerPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      holder.socket?.destroy();
      reject(new Error(`SMTP delivery timed out after ${timeoutMs}ms (${cfg.host}:${cfg.port})`));
    }, timeoutMs);
    timer.unref();
  });

  const deliver = async (): Promise<{ messageId: string; smtpResponse: string }> => {
    const conn = await openAuthenticatedSession(cfg);
    holder.socket = conn.socket;

    await conn.session.command(`MAIL FROM:<${cfg.fromAddress}>`, [250]);
    await conn.session.command(`RCPT TO:<${cfg.notifyEmail}>`, [250, 251]);
    await conn.session.command("DATA", [354]);
    const queued = await conn.session.command(`${dotStuffed}\r\n.`, [250], "DATA END");
    await conn.session.command("QUIT", [221]).catch((): null => null);
    conn.session.detach();
    conn.socket.destroy();

    return {
      messageId,
      smtpResponse: queued.lines.join(" ")
    };
  };

  try {
    return await Promise.race([deliver(), timerPromise]);
  } finally {
    holder.socket?.destroy();
  }
}

/**
 * Builds an outbound email dispatcher bound to `env` if Direct Mailbox SMTP is configured.
 * Throws immediately if `env` has a partial/invalid SMTP configuration.
 */
export function createSmtpDispatcherFromEnv(
  env: Record<string, string | undefined> = process.env
): ((payload: OutboundEmailPayload) => Promise<boolean>) | undefined {
  const cfg = resolveSmtpConfig(env);
  if (!cfg) {
    return undefined;
  }

  return async (payload: OutboundEmailPayload): Promise<boolean> => {
    try {
      await sendSmtpMessage(payload, cfg);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown_smtp_error";
      console.error(`[byggflyt-smtp] Delivery failed for ${payload.referenceId}: ${msg}`);
      return false;
    }
  };
}

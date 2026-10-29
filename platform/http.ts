import type { IncomingMessage, ServerResponse } from "node:http";

const MAX_BODY_BYTES = 64 * 1024;

/** Hardened headers for platform pages: no scripts at all, same-origin styles and forms only. */
const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy":
    "default-src 'none'; style-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cache-Control": "no-store"
};

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, "Forespørselen er for stor."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export async function readForm(req: IncomingMessage): Promise<URLSearchParams> {
  const type = req.headers["content-type"] ?? "";
  if (!type.startsWith("application/x-www-form-urlencoded")) {
    throw new HttpError(415, "Forventet skjemadata.");
  }
  return new URLSearchParams(await readBody(req));
}

export function parseCookies(req: IncomingMessage): Map<string, string> {
  const jar = new Map<string, string>();
  const header = req.headers.cookie ?? "";
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    try {
      jar.set(name, decodeURIComponent(value));
    } catch {
      // ignore malformed cookie values
    }
  }
  return jar;
}

export interface CookieOptions {
  readonly maxAgeSeconds: number;
  readonly secure: boolean;
}

export function serializeCookie(name: string, value: string, opts: CookieOptions): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${opts.maxAgeSeconds}`
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

/**
 * Cross-site request guard for state-changing requests. SameSite=Strict cookies already
 * block most CSRF; this additionally rejects requests whose Origin/Referer is foreign.
 */
export function assertSameOrigin(req: IncomingMessage): void {
  const host = req.headers.host;
  const source = req.headers.origin ?? req.headers.referer;
  if (!host || !source) return; // non-browser clients (no ambient cookies to abuse)
  let sourceHost: string;
  try {
    sourceHost = new URL(source).host;
  } catch {
    throw new HttpError(403, "Ugyldig opprinnelse.");
  }
  if (sourceHost !== host) {
    throw new HttpError(403, "Forespørsel fra fremmed opprinnelse avvist.");
  }
}

export function clientIp(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? "unknown";
}

export function sendHtml(
  res: ServerResponse,
  status: number,
  body: string,
  extraHeaders: Record<string, string | string[]> = {}
): void {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    "Content-Type": "text/html; charset=utf-8",
    ...extraHeaders
  });
  res.end(body);
}

export function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { ...SECURITY_HEADERS, "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

export function sendCss(res: ServerResponse, css: string): void {
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    "Content-Type": "text/css; charset=utf-8",
    "Cache-Control": "public, max-age=300"
  });
  res.end(css);
}

export function redirect(
  res: ServerResponse,
  location: string,
  extraHeaders: Record<string, string | string[]> = {}
): void {
  res.writeHead(303, { ...SECURITY_HEADERS, Location: location, ...extraHeaders });
  res.end();
}

/** Build a redirect target with a flash message carried in the query string. */
export function withFlash(path: string, kind: "ok" | "err", message: string): string {
  const url = new URL(path, "http://local");
  url.searchParams.set(kind, message.slice(0, 300));
  return `${url.pathname}${url.search}`;
}

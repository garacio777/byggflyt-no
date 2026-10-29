import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

/** Hash a password with a per-password random salt. Format: scrypt$<saltB64>$<hashB64>. */
export function hashSecret(secret: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(secret, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifySecret(secret: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(secret, Buffer.from(saltB64, "base64"), expected.length, SCRYPT_PARAMS);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Opaque random session token handed to the browser. Only its SHA-256 is stored. */
export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

export function newAccessCode(): string {
  return randomBytes(15).toString("base64url");
}

/** Per-session CSRF token derived from the session token; verified on every POST. */
export function csrfTokenFor(sessionToken: string): string {
  return createHmac("sha256", sessionToken).update("byggflyt-csrf-v1").digest("base64url");
}

export function csrfMatches(sessionToken: string, submitted: string | null): boolean {
  if (!submitted) return false;
  const expected = Buffer.from(csrfTokenFor(sessionToken));
  const actual = Buffer.from(submitted);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Small in-memory sliding-window limiter for login endpoints. */
export class LoginThrottle {
  private readonly failures = new Map<string, number[]>();
  private readonly maxFailures: number;
  private readonly windowMs: number;

  constructor(maxFailures: number, windowMs: number) {
    this.maxFailures = maxFailures;
    this.windowMs = windowMs;
  }

  isBlocked(key: string): boolean {
    return this.recent(key).length >= this.maxFailures;
  }

  recordFailure(key: string): void {
    const list = this.recent(key);
    list.push(Date.now());
    this.failures.set(key, list);
  }

  reset(key: string): void {
    this.failures.delete(key);
  }

  private recent(key: string): number[] {
    const cutoff = Date.now() - this.windowMs;
    return (this.failures.get(key) ?? []).filter((t) => t > cutoff);
  }
}

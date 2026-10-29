import { writeFileSync } from "node:fs";
import { getStaticCmsConfig } from "../src/data/cms-loader.ts";
import { SiteCmsConfigSchema, type SiteCmsConfig } from "../src/schemas/platform.ts";
import { nowIso, num, str, type Db } from "./db.ts";
import { hashSecret, newAccessCode, newSessionToken, sha256, verifySecret } from "./security.ts";

export type Realm = "partner" | "admin";

const SESSION_TTL_SECONDS = 60 * 60 * 12;

export class SessionStore {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  readonly ttlSeconds = SESSION_TTL_SECONDS;

  create(realm: Realm, subjectId: string): string {
    const token = newSessionToken();
    this.db.run(
      "INSERT INTO sessions (token_hash, realm, subject_id, expires_at) VALUES (?, ?, ?, ?)",
      sha256(token),
      realm,
      subjectId,
      Date.now() + SESSION_TTL_SECONDS * 1000
    );
    return token;
  }

  /** Resolves a session token to its subject id, scoped to one realm (partner vs admin). */
  resolve(realm: Realm, token: string | undefined): string | null {
    if (!token) return null;
    const row = this.db.get(
      "SELECT subject_id, expires_at FROM sessions WHERE token_hash = ? AND realm = ?",
      sha256(token),
      realm
    );
    if (!row) return null;
    if (num(row, "expires_at") < Date.now()) {
      this.destroy(token);
      return null;
    }
    return str(row, "subject_id");
  }

  destroy(token: string): void {
    this.db.run("DELETE FROM sessions WHERE token_hash = ?", sha256(token));
  }

  destroyAllFor(realm: Realm, subjectId: string): void {
    this.db.run("DELETE FROM sessions WHERE realm = ? AND subject_id = ?", realm, subjectId);
  }

  purgeExpired(): void {
    this.db.run("DELETE FROM sessions WHERE expires_at < ?", Date.now());
  }
}

export class AdminStore {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /**
   * Ensures an admin account exists. Uses ADMIN_USERNAME / ADMIN_ACCESS_CODE when provided,
   * otherwise generates a one-time access code and returns it so the caller can print it once.
   */
  bootstrap(username: string, accessCodeFromEnv: string | undefined): string | null {
    const existing = this.db.get("SELECT 1 AS x FROM admin_users LIMIT 1");
    if (existing) return null;
    const code = accessCodeFromEnv && accessCodeFromEnv.length >= 8 ? accessCodeFromEnv : newAccessCode();
    this.db.run(
      "INSERT INTO admin_users (username, access_hash, updated_at) VALUES (?, ?, ?)",
      username,
      hashSecret(code),
      nowIso()
    );
    return accessCodeFromEnv === code ? null : code;
  }

  authenticate(username: string, accessCode: string): boolean {
    const row = this.db.get("SELECT access_hash FROM admin_users WHERE username = ?", username);
    return row ? verifySecret(accessCode, str(row, "access_hash")) : false;
  }

  rotate(username: string, newCode: string): void {
    this.db.run(
      "UPDATE admin_users SET access_hash = ?, updated_at = ? WHERE username = ?",
      hashSecret(newCode),
      nowIso(),
      username
    );
  }
}

export class CmsStore {
  private readonly db: Db;
  private readonly publishPath: string;

  constructor(db: Db, publishPath: string) {
    this.db = db;
    this.publishPath = publishPath;
  }

  get(): SiteCmsConfig {
    const row = this.db.get("SELECT config_json FROM cms_config WHERE id = 1");
    if (row) {
      try {
        const parsed = SiteCmsConfigSchema.safeParse(JSON.parse(str(row, "config_json")));
        if (parsed.success) return parsed.data;
      } catch {
        // fall through to the build-time config
      }
    }
    return getStaticCmsConfig();
  }

  /** Validates and stores a new config. Returns an error message on failure. */
  save(next: unknown): string | null {
    const parsed = SiteCmsConfigSchema.safeParse(next);
    if (!parsed.success) {
      return parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    }
    this.db.run(
      `INSERT INTO cms_config (id, config_json, updated_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at`,
      JSON.stringify(parsed.data),
      nowIso()
    );
    return null;
  }

  update(mutator: (draft: SiteCmsConfig) => SiteCmsConfig): string | null {
    return this.save(mutator(structuredClone(this.get())));
  }

  /** Writes the live config to src/data/cms-overrides.json so the next static build picks it up. */
  publish(): string {
    writeFileSync(this.publishPath, `${JSON.stringify(this.get(), null, 2)}\n`, "utf8");
    return this.publishPath;
  }
}

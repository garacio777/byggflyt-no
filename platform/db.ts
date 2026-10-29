import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

type Row = Record<string, unknown>;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  org_nr TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  public_phone TEXT NOT NULL,
  public_email TEXT NOT NULL,
  depot_location TEXT NOT NULL,
  headline TEXT NOT NULL,
  description TEXT NOT NULL,
  municipalities TEXT NOT NULL,
  categories TEXT NOT NULL,
  certifications TEXT NOT NULL,
  zero_emission_fleet INTEGER NOT NULL,
  response_sla_minutes INTEGER NOT NULL,
  webhook_url TEXT NOT NULL,
  status TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0,
  verified_brreg INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  realm TEXT NOT NULL CHECK (realm IN ('partner', 'admin')),
  subject_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  municipality_slug TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  model_name TEXT NOT NULL,
  powertrain_label TEXT NOT NULL,
  zero_emission INTEGER NOT NULL,
  daily_rate_nok INTEGER NOT NULL,
  weekly_rate_nok INTEGER NOT NULL,
  specs_summary TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS leases (
  id TEXT PRIMARY KEY,
  slot_key TEXT NOT NULL,
  municipality_slug TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  monthly_nok INTEGER NOT NULL,
  status TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS leads (
  lead_reference_id TEXT PRIMARY KEY,
  territory_slot_key TEXT NOT NULL,
  assigned_business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL,
  record_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_users (
  username TEXT PRIMARY KEY,
  access_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cms_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_equipment_business ON equipment(business_id);
CREATE INDEX IF NOT EXISTS idx_leases_slot ON leases(slot_key, status);
CREATE INDEX IF NOT EXISTS idx_leads_business ON leads(assigned_business_id);
`;

/** Thin typed wrapper around node:sqlite (built into Node 22; no native npm modules). */
export class Db {
  readonly raw: DatabaseSync;

  constructor(file: string) {
    if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
    this.raw = new DatabaseSync(file);
    this.raw.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;");
    this.raw.exec(SCHEMA);
  }

  all(sql: string, ...params: SQLInputValue[]): Row[] {
    return this.raw.prepare(sql).all(...params);
  }

  get(sql: string, ...params: SQLInputValue[]): Row | undefined {
    return this.raw.prepare(sql).get(...params);
  }

  run(sql: string, ...params: SQLInputValue[]): number {
    return Number(this.raw.prepare(sql).run(...params).changes);
  }

  transaction<T>(fn: () => T): T {
    this.raw.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.raw.exec("COMMIT");
      return result;
    } catch (error) {
      this.raw.exec("ROLLBACK");
      throw error;
    }
  }
}

export function str(row: Row, key: string): string {
  const v = row[key];
  return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);
}

export function num(row: Row, key: string): number {
  const v = row[key];
  return typeof v === "number" ? v : typeof v === "bigint" ? Number(v) : Number(v ?? 0);
}

export function bool(row: Row, key: string): boolean {
  return num(row, key) === 1;
}

export function jsonList(row: Row, key: string): unknown {
  try {
    return JSON.parse(str(row, key));
  } catch {
    return [];
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

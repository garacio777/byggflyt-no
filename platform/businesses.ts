import {
  BusinessAccountViewSchema,
  BusinessPublicProfileSchema,
  type BusinessAccountView,
  type BusinessProfileUpdateRequest,
  type BusinessPublicProfile,
  type BusinessRegisterRequest,
  type BusinessStatus
} from "../src/schemas/platform.ts";
import { bool, jsonList, nowIso, num, str, type Db } from "./db.ts";
import { hashSecret, newId, verifySecret } from "./security.ts";

type Row = Record<string, unknown>;

function toAccountView(row: Row): BusinessAccountView | null {
  const parsed = BusinessAccountViewSchema.safeParse({
    id: str(row, "id"),
    orgNr: str(row, "org_nr"),
    companyName: str(row, "company_name"),
    contactName: str(row, "contact_name"),
    email: str(row, "email"),
    publicPhone: str(row, "public_phone"),
    publicEmail: str(row, "public_email"),
    depotLocation: str(row, "depot_location"),
    headline: str(row, "headline"),
    description: str(row, "description"),
    municipalities: jsonList(row, "municipalities"),
    categories: jsonList(row, "categories"),
    certifications: jsonList(row, "certifications"),
    zeroEmissionFleet: bool(row, "zero_emission_fleet"),
    responseSlaMinutes: num(row, "response_sla_minutes"),
    webhookUrl: str(row, "webhook_url"),
    status: str(row, "status"),
    featured: bool(row, "featured"),
    verifiedBrreg: bool(row, "verified_brreg"),
    createdAt: str(row, "created_at")
  });
  if (!parsed.success) {
    console.error(`[platform] business row ${str(row, "id")} failed schema validation`);
    return null;
  }
  return parsed.data;
}

export class BusinessRepo {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  emailOrOrgTaken(email: string, orgNr: string): boolean {
    return this.db.get("SELECT 1 AS x FROM businesses WHERE email = ? OR org_nr = ?", email, orgNr) !== undefined;
  }

  create(input: BusinessRegisterRequest, status: BusinessStatus): string {
    const id = newId("biz");
    this.db.run(
      `INSERT INTO businesses (id, org_nr, company_name, contact_name, email, password_hash, public_phone,
        public_email, depot_location, headline, description, municipalities, categories, certifications,
        zero_emission_fleet, response_sla_minutes, webhook_url, status, featured, verified_brreg, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
      id,
      input.orgNr,
      input.companyName,
      input.contactName,
      input.email,
      hashSecret(input.password),
      input.phone,
      input.email,
      input.depotLocation,
      input.headline,
      input.description,
      JSON.stringify(input.municipalities),
      JSON.stringify(input.categories),
      JSON.stringify(input.certifications),
      input.zeroEmissionFleet ? 1 : 0,
      input.responseSlaMinutes,
      input.webhookUrl,
      status,
      nowIso()
    );
    return id;
  }

  /** Returns the business id when the credentials are valid. */
  authenticate(email: string, password: string): string | null {
    const row = this.db.get("SELECT id, password_hash FROM businesses WHERE email = ?", email);
    if (!row) return null;
    return verifySecret(password, str(row, "password_hash")) ? str(row, "id") : null;
  }

  find(id: string): BusinessAccountView | null {
    const row = this.db.get("SELECT * FROM businesses WHERE id = ?", id);
    return row ? toAccountView(row) : null;
  }

  list(): BusinessAccountView[] {
    return this.db
      .all("SELECT * FROM businesses ORDER BY created_at DESC")
      .map(toAccountView)
      .filter((b): b is BusinessAccountView => b !== null);
  }

  updateProfile(id: string, input: BusinessProfileUpdateRequest): void {
    this.db.run(
      `UPDATE businesses SET contact_name = ?, public_phone = ?, public_email = ?, depot_location = ?,
        headline = ?, description = ?, municipalities = ?, categories = ?, certifications = ?,
        zero_emission_fleet = ?, response_sla_minutes = ?, webhook_url = ? WHERE id = ?`,
      input.contactName,
      input.publicPhone,
      input.publicEmail,
      input.depotLocation,
      input.headline,
      input.description,
      JSON.stringify(input.municipalities),
      JSON.stringify(input.categories),
      JSON.stringify(input.certifications),
      input.zeroEmissionFleet ? 1 : 0,
      input.responseSlaMinutes,
      input.webhookUrl,
      id
    );
  }

  adminUpdate(
    id: string,
    input: BusinessProfileUpdateRequest & { companyName: string; featured: boolean; status: BusinessStatus }
  ): void {
    this.updateProfile(id, input);
    this.db.run(
      "UPDATE businesses SET company_name = ?, featured = ?, status = ? WHERE id = ?",
      input.companyName,
      input.featured ? 1 : 0,
      input.status,
      id
    );
  }

  setStatus(id: string, status: BusinessStatus, featured: boolean | undefined): number {
    if (featured === undefined) {
      return this.db.run("UPDATE businesses SET status = ? WHERE id = ?", status, id);
    }
    return this.db.run("UPDATE businesses SET status = ?, featured = ? WHERE id = ?", status, featured ? 1 : 0, id);
  }

  resetPassword(id: string, newPassword: string): number {
    return this.db.run("UPDATE businesses SET password_hash = ? WHERE id = ?", hashSecret(newPassword), id);
  }

  delete(id: string): number {
    return this.db.run("DELETE FROM businesses WHERE id = ?", id);
  }

  /** Public directory profile (approved businesses only). */
  publicProfile(view: BusinessAccountView, activeTerritories: number): BusinessPublicProfile | null {
    const parsed = BusinessPublicProfileSchema.safeParse({
      id: view.id,
      orgNr: view.orgNr,
      companyName: view.companyName,
      headline: view.headline,
      description: view.description,
      depotLocation: view.depotLocation,
      publicPhone: view.publicPhone,
      publicEmail: view.publicEmail,
      municipalities: view.municipalities,
      categories: view.categories,
      certifications: view.certifications,
      zeroEmissionFleet: view.zeroEmissionFleet,
      responseSlaMinutes: view.responseSlaMinutes,
      featured: view.featured,
      verifiedBrreg: view.verifiedBrreg,
      activeTerritoriesCount: activeTerritories,
      createdAt: view.createdAt
    });
    return parsed.success ? parsed.data : null;
  }
}

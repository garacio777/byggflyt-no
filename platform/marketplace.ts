import { BASE_CATEGORIES } from "../src/data/categories.ts";
import { BASE_MUNICIPALITIES } from "../src/data/municipalities.ts";
import type { CategorySlug, MunicipalitySlug } from "../src/schemas/directory.ts";
import {
  PartnerEquipmentItemSchema,
  StoredLeadRecordSchema,
  TerritoryLeaseRecordSchema,
  type LeadStage,
  type PartnerEquipmentItem,
  type PartnerEquipmentStatus,
  type SiteCmsConfig,
  type StoredLeadRecord,
  type TerritoryLeaseRecord,
  type TerritoryLeaseStatus,
  type TerritorySlotAvailability
} from "../src/schemas/platform.ts";
import { bool, nowIso, num, str, type Db } from "./db.ts";
import { newId } from "./security.ts";

type Row = Record<string, unknown>;

export interface SlotView {
  readonly slotKey: string;
  readonly municipalitySlug: MunicipalitySlug;
  readonly municipalityName: string;
  readonly categorySlug: CategorySlug;
  readonly categoryName: string;
  readonly monthlyLeaseNok: number;
  readonly priceOverridden: boolean;
  readonly estMonthlyLeadsMin: number;
  readonly estMonthlyLeadsMax: number;
  readonly availability: TerritorySlotAvailability;
  readonly statusOverride: TerritorySlotAvailability | null;
  readonly activeLease: TerritoryLeaseRecord | null;
}

export function slotKeyFor(m: MunicipalitySlug, c: CategorySlug): string {
  return `${m}__${c}`;
}

export const MUNICIPALITY_OPTIONS = BASE_MUNICIPALITIES.map((m) => ({ value: m.slug, label: m.name }));
export const CATEGORY_OPTIONS = BASE_CATEGORIES.map((c) => ({ value: c.slug, label: c.shortTitle }));

function leaseFromRow(row: Row): TerritoryLeaseRecord | null {
  const parsed = TerritoryLeaseRecordSchema.safeParse({
    id: str(row, "id"),
    slotKey: str(row, "slot_key"),
    municipalitySlug: str(row, "municipality_slug"),
    categorySlug: str(row, "category_slug"),
    businessId: str(row, "business_id"),
    businessName: str(row, "company_name"),
    businessOrgNr: str(row, "org_nr"),
    monthlyNok: num(row, "monthly_nok"),
    status: str(row, "status"),
    notes: str(row, "notes"),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at")
  });
  return parsed.success ? parsed.data : null;
}

function equipmentFromRow(row: Row): PartnerEquipmentItem | null {
  const parsed = PartnerEquipmentItemSchema.safeParse({
    id: str(row, "id"),
    businessId: str(row, "business_id"),
    businessName: str(row, "company_name"),
    municipalitySlug: str(row, "municipality_slug"),
    categorySlug: str(row, "category_slug"),
    modelName: str(row, "model_name"),
    powertrainLabel: str(row, "powertrain_label"),
    zeroEmission: bool(row, "zero_emission"),
    dailyRateNok: num(row, "daily_rate_nok"),
    weeklyRateNok: num(row, "weekly_rate_nok"),
    specsSummary: str(row, "specs_summary"),
    status: str(row, "status"),
    createdAt: str(row, "created_at")
  });
  return parsed.success ? parsed.data : null;
}

function leadFromRow(row: Row): StoredLeadRecord | null {
  try {
    const parsed = StoredLeadRecordSchema.safeParse(JSON.parse(str(row, "record_json")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const LEASE_SELECT = `SELECT l.*, b.company_name, b.org_nr FROM leases l JOIN businesses b ON b.id = l.business_id`;
const EQUIPMENT_SELECT = `SELECT e.*, b.company_name FROM equipment e JOIN businesses b ON b.id = e.business_id`;

export class Marketplace {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  // ---------- Territory slots ----------

  slots(cms: SiteCmsConfig): SlotView[] {
    const active = new Map<string, TerritoryLeaseRecord>();
    for (const lease of this.leases("ACTIVE")) active.set(lease.slotKey, lease);

    const views: SlotView[] = [];
    for (const m of BASE_MUNICIPALITIES) {
      const baseMonthly = cms.municipalityOverrides[m.slug]?.baseMonthlyTerritoryNok ?? m.baseMonthlyTerritoryNok;
      for (const c of BASE_CATEGORIES) {
        const key = slotKeyFor(m.slug, c.slug);
        const multiplier = cms.categoryOverrides[c.slug]?.retainerMultiplier ?? c.retainerMultiplier;
        const computed = Math.round((baseMonthly * multiplier) / 100) * 100;
        const override = cms.slotPriceOverrides[key];
        const statusOverride = cms.slotStatusOverrides[key] ?? null;
        const lease = active.get(key) ?? null;
        const demandBase = Math.round(baseMonthly / 950);
        views.push({
          slotKey: key,
          municipalitySlug: m.slug,
          municipalityName: m.name,
          categorySlug: c.slug,
          categoryName: c.shortTitle,
          monthlyLeaseNok: override ?? computed,
          priceOverridden: override !== undefined,
          estMonthlyLeadsMin: Math.max(5, demandBase),
          estMonthlyLeadsMax: Math.max(11, Math.round(demandBase * 2.1)),
          availability: lease ? "LEASED_EXCLUSIVE" : statusOverride === "WAITLIST_ONLY" ? "WAITLIST_ONLY" : "AVAILABLE_FOR_EXCLUSIVE_LEASE",
          statusOverride,
          activeLease: lease
        });
      }
    }
    return views;
  }

  // ---------- Leases ----------

  leases(status?: TerritoryLeaseStatus): TerritoryLeaseRecord[] {
    const rows = status
      ? this.db.all(`${LEASE_SELECT} WHERE l.status = ? ORDER BY l.updated_at DESC`, status)
      : this.db.all(`${LEASE_SELECT} ORDER BY l.updated_at DESC`);
    return rows.map(leaseFromRow).filter((l): l is TerritoryLeaseRecord => l !== null);
  }

  leasesFor(businessId: string): TerritoryLeaseRecord[] {
    return this.db
      .all(`${LEASE_SELECT} WHERE l.business_id = ? ORDER BY l.updated_at DESC`, businessId)
      .map(leaseFromRow)
      .filter((l): l is TerritoryLeaseRecord => l !== null);
  }

  hasOpenLeaseRequest(businessId: string, slotKey: string): boolean {
    return (
      this.db.get(
        "SELECT 1 AS x FROM leases WHERE business_id = ? AND slot_key = ? AND status IN ('PENDING', 'ACTIVE')",
        businessId,
        slotKey
      ) !== undefined
    );
  }

  requestLease(businessId: string, m: MunicipalitySlug, c: CategorySlug, monthlyNok: number, notes: string): void {
    const now = nowIso();
    this.db.run(
      `INSERT INTO leases (id, slot_key, municipality_slug, category_slug, business_id, monthly_nok, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
      newId("lease"),
      slotKeyFor(m, c),
      m,
      c,
      businessId,
      monthlyNok,
      notes,
      now,
      now
    );
  }

  /** Sets a lease status. Activating a lease revokes any other active lease on the same slot (exclusivity). */
  setLeaseStatus(leaseId: string, status: TerritoryLeaseStatus, monthlyNok: number | undefined): number {
    return this.db.transaction(() => {
      const row = this.db.get("SELECT slot_key FROM leases WHERE id = ?", leaseId);
      if (!row) return 0;
      const now = nowIso();
      if (status === "ACTIVE") {
        this.db.run(
          "UPDATE leases SET status = 'REVOKED', updated_at = ? WHERE slot_key = ? AND status = 'ACTIVE' AND id <> ?",
          now,
          str(row, "slot_key"),
          leaseId
        );
      }
      if (monthlyNok !== undefined) {
        return this.db.run("UPDATE leases SET status = ?, monthly_nok = ?, updated_at = ? WHERE id = ?", status, monthlyNok, now, leaseId);
      }
      return this.db.run("UPDATE leases SET status = ?, updated_at = ? WHERE id = ?", status, now, leaseId);
    });
  }

  assignExclusive(m: MunicipalitySlug, c: CategorySlug, businessId: string, monthlyNok: number, notes: string): void {
    this.db.transaction(() => {
      const key = slotKeyFor(m, c);
      const now = nowIso();
      this.db.run("UPDATE leases SET status = 'REVOKED', updated_at = ? WHERE slot_key = ? AND status = 'ACTIVE'", now, key);
      this.db.run(
        `INSERT INTO leases (id, slot_key, municipality_slug, category_slug, business_id, monthly_nok, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
        newId("lease"),
        key,
        m,
        c,
        businessId,
        monthlyNok,
        notes,
        now,
        now
      );
    });
  }

  activeLeaseHolder(slotKey: string): string | null {
    const row = this.db.get("SELECT business_id FROM leases WHERE slot_key = ? AND status = 'ACTIVE' LIMIT 1", slotKey);
    return row ? str(row, "business_id") : null;
  }

  // ---------- Partner equipment ----------

  equipment(): PartnerEquipmentItem[] {
    return this.db
      .all(`${EQUIPMENT_SELECT} ORDER BY e.created_at DESC`)
      .map(equipmentFromRow)
      .filter((e): e is PartnerEquipmentItem => e !== null);
  }

  equipmentFor(businessId: string): PartnerEquipmentItem[] {
    return this.db
      .all(`${EQUIPMENT_SELECT} WHERE e.business_id = ? ORDER BY e.created_at DESC`, businessId)
      .map(equipmentFromRow)
      .filter((e): e is PartnerEquipmentItem => e !== null);
  }

  addEquipment(
    businessId: string,
    item: Omit<PartnerEquipmentItem, "id" | "businessId" | "businessName" | "status" | "createdAt">,
    status: PartnerEquipmentStatus
  ): void {
    this.db.run(
      `INSERT INTO equipment (id, business_id, municipality_slug, category_slug, model_name, powertrain_label,
        zero_emission, daily_rate_nok, weekly_rate_nok, specs_summary, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newId("eq"),
      businessId,
      item.municipalitySlug,
      item.categorySlug,
      item.modelName,
      item.powertrainLabel,
      item.zeroEmission ? 1 : 0,
      item.dailyRateNok,
      item.weeklyRateNok,
      item.specsSummary,
      status,
      nowIso()
    );
  }

  /** Deletes an item; when ownerId is given the item must belong to that business (tenant isolation). */
  deleteEquipment(equipmentId: string, ownerId: string | null): number {
    return ownerId
      ? this.db.run("DELETE FROM equipment WHERE id = ? AND business_id = ?", equipmentId, ownerId)
      : this.db.run("DELETE FROM equipment WHERE id = ?", equipmentId);
  }

  moderateEquipment(equipmentId: string, status: PartnerEquipmentStatus): number {
    return this.db.run("UPDATE equipment SET status = ? WHERE id = ?", status, equipmentId);
  }

  // ---------- Leads ----------

  leads(): StoredLeadRecord[] {
    return this.db
      .all("SELECT record_json FROM leads ORDER BY created_at DESC")
      .map(leadFromRow)
      .filter((l): l is StoredLeadRecord => l !== null);
  }

  leadsFor(businessId: string): StoredLeadRecord[] {
    return this.db
      .all("SELECT record_json FROM leads WHERE assigned_business_id = ? ORDER BY created_at DESC", businessId)
      .map(leadFromRow)
      .filter((l): l is StoredLeadRecord => l !== null);
  }

  findLead(ref: string): StoredLeadRecord | null {
    const row = this.db.get("SELECT record_json FROM leads WHERE lead_reference_id = ?", ref);
    return row ? leadFromRow(row) : null;
  }

  saveLead(lead: StoredLeadRecord): void {
    this.db.run(
      `INSERT INTO leads (lead_reference_id, territory_slot_key, assigned_business_id, record_json, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(lead_reference_id) DO UPDATE SET
         territory_slot_key = excluded.territory_slot_key,
         assigned_business_id = excluded.assigned_business_id,
         record_json = excluded.record_json`,
      lead.leadReferenceId,
      lead.territorySlotKey,
      lead.assignedBusinessId,
      JSON.stringify(lead),
      lead.createdAt
    );
  }

  updateLeadStage(ref: string, stage: LeadStage, notes: string, ownerId: string | null): boolean {
    const lead = this.findLead(ref);
    if (!lead) return false;
    if (ownerId !== null && lead.assignedBusinessId !== ownerId) return false;
    this.saveLead({ ...lead, leadStage: stage, partnerNotes: notes });
    return true;
  }

  deleteLead(ref: string): number {
    return this.db.run("DELETE FROM leads WHERE lead_reference_id = ?", ref);
  }

  activeTerritoryCount(businessId: string): number {
    const row = this.db.get("SELECT COUNT(*) AS n FROM leases WHERE business_id = ? AND status = 'ACTIVE'", businessId);
    return row ? num(row, "n") : 0;
  }
}

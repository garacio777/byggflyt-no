import rawCmsJson from "./cms-overrides.json" with { type: "json" };
import { SiteCmsConfigSchema, type SiteCmsConfig } from "../schemas/platform.js";

const DEFAULT_CMS_CONFIG: SiteCmsConfig = {
  siteOrigin: "https://byggflyt-no.vercel.app",
  announcementBanner: "",
  heroBadgeText: "ØSTLANDET B2B ANLEGGSPORTAL",
  heroTitle:
    "Dimensjoner rigg, maskin og vinterdrift på 30 sekunder — bestill direkte fra lokal fagpartner",
  heroLead:
    "Slutt på PDF-kataloger, feildimensjonert utstyr og anbudstjenester som selger telefonnummeret ditt til fem selgere. Bruk våre deterministiske 06:45-feltkalkulatorer og send ferdig spesifisert EHF-oppdrag til ett lokalt depot nær byggeplassen.",
  partnerCalloutTitle:
    "Driver du utleieselskap, maskinentreprenør, kranbil eller stillasfirma?",
  partnerCalloutLead:
    "Opprett gratis bedriftskonto i leverandørkatalogen eller lei eksklusiv tilgang til ferdig beregnede, Brreg-verifiserte B2B-forespørsler i din kommune.",
  footerTagline: "Deterministisk B2B Rigg- & Maskinportal for Østlandet.",
  autoApproveBusinesses: false,
  autoApproveEquipment: false,
  autoRouteLeadsToExclusivePartner: true,
  municipalityOverrides: {},
  categoryOverrides: {},
  slotPriceOverrides: {},
  slotStatusOverrides: {},
  skuRateOverrides: {}
};

export function getStaticCmsConfig(): SiteCmsConfig {
  const parsed = SiteCmsConfigSchema.safeParse(rawCmsJson);
  if (parsed.success) {
    return parsed.data;
  }
  return DEFAULT_CMS_CONFIG;
}

export { DEFAULT_CMS_CONFIG };

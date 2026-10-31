import { z } from "zod";

export const MunicipalitySlugEnum = z.enum([
  "oslo",
  "baerum-asker",
  "nordre-follo-aas",
  "lillestrom-lorenskog",
  "ullensaker-gardermoen",
  "moss-vestby",
  "indre-ostfold",
  "sarpsborg",
  "fredrikstad",
  "drammen-lier"
]);

export const CategorySlugEnum = z.enum([
  "maskinutleie",
  "lift-og-stillas",
  "vintervarme-og-teletining",
  "byggestrom-og-utslippsfri-rigg",
  "container-kranbil-og-masse"
]);

export type MunicipalitySlug = z.infer<typeof MunicipalitySlugEnum>;
export type CategorySlug = z.infer<typeof CategorySlugEnum>;

export const DeliveryChannelEnum = z.enum([
  "EMAIL_SMTP",
  "PARTNER_WEBHOOK",
  "SLACK_WEBHOOK",
  "EMAIL_RESEND",
  "TERRITORY_QUEUE"
]);

export const SkuCodeSchema = z
  .string()
  .regex(/^SKU-[A-Z0-9-]{4,18}$/, "Ugyldig maskin-SKU format.");

export type DeliveryChannel = z.infer<typeof DeliveryChannelEnum>;
export type SkuCode = z.infer<typeof SkuCodeSchema>;

/**
 * Deterministic Norwegian Modulus-11 checksum check for 9-digit organisasjonsnummer.
 */
export function validateNorwegianOrgNr(raw: string): boolean {
  const cleaned = raw.replace(/\s+/g, "");
  if (!/^[89][0-9]{8}$/.test(cleaned)) {
    return false;
  }
  const weights = [3, 2, 7, 6, 5, 4, 3, 2] as const;
  let sum = 0;
  for (let i = 0; i < 8; i += 1) {
    const digit = Number(cleaned.charAt(i));
    const weight = weights[i] ?? 0;
    sum += digit * weight;
  }
  const remainder = sum % 11;
  if (remainder === 1) {
    return false;
  }
  const expectedCheckDigit = remainder === 0 ? 0 : 11 - remainder;
  return Number(cleaned.charAt(8)) === expectedCheckDigit;
}

export const OrgLookupQuerySchema = z
  .object({
    orgnr: z
      .string()
      .transform((val) => val.replace(/\s+/g, ""))
      .refine((val) => validateNorwegianOrgNr(val), {
        message: "Ugyldig norsk organisasjonsnummer (9 siffer, Modulus-11 kontroll)."
      })
  })
  .strict();

/**
 * External Enhetsregisteret (data.brreg.no) JSON contract.
 * Uses passthrough on nested public objects so upstream field additions do not break parsing,
 * then maps into our strict VerifiedOrgResponseSchema.
 */
export const BrregExternalEnhetSchema = z
  .object({
    organisasjonsnummer: z.string(),
    navn: z.string(),
    organisasjonsform: z
      .object({
        kode: z.string(),
        beskrivelse: z.string().optional()
      })
      .passthrough()
      .optional(),
    registrertIMvaregisteret: z.boolean().optional(),
    konkurs: z.boolean().optional(),
    underAvvikling: z.boolean().optional(),
    underTvangsavviklingEllerTvangsopplosning: z.boolean().optional(),
    naeringskode1: z
      .object({
        kode: z.string().optional(),
        beskrivelse: z.string().optional()
      })
      .passthrough()
      .optional(),
    forretningsadresse: z
      .object({
        kommune: z.string().optional(),
        postnummer: z.string().optional(),
        poststed: z.string().optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

export const VerifiedOrgResponseSchema = z
  .object({
    orgNr: z.string().regex(/^[89][0-9]{8}$/),
    companyName: z.string().min(2).max(160),
    orgFormCode: z.string().min(1).max(16),
    vatRegistered: z.boolean(),
    activeInBusiness: z.boolean(),
    naceCode: z.string().max(16),
    naceDescription: z.string().max(160),
    municipalityName: z.string().max(80),
    postalCode: z.string().max(8),
    ehfEligible: z.boolean(),
    verificationSource: z.enum(["BRREG_LIVE", "MOD11_OFFLINE_FALLBACK"])
  })
  .strict();

export const CalculatorSnapshotSchema = z
  .object({
    calculatorType: CategorySlugEnum,
    headlineSpec: z.string().min(4).max(220),
    estimatedValueNokMin: z.number().int().min(1000).max(5000000),
    estimatedValueNokMax: z.number().int().min(1000).max(10000000),
    complianceSummary: z.string().min(4).max(260)
  })
  .strict();

export const LeadSubmissionRequestSchema = z
  .object({
    orgNr: z
      .string()
      .transform((val) => val.replace(/\s+/g, ""))
      .refine((val) => validateNorwegianOrgNr(val), {
        message: "Oppgi et gyldig 9-sifret organisasjonsnummer (Modulus-11)."
      }),
    companyName: z.string().trim().min(2, "Firmanavn må fylles ut.").max(140),
    contactName: z.string().trim().min(2, "Kontaktperson må fylles ut.").max(100),
    phone: z
      .string()
      .transform((val) => val.replace(/[\s-]/g, ""))
      .refine((val) => /^(\+47)?[2-9][0-9]{7}$/.test(val), {
        message: "Oppgi gyldig norsk telefonnummer (8 siffer)."
      }),
    municipalitySlug: MunicipalitySlugEnum,
    categorySlug: CategorySlugEnum,
    postalCode: z.string().regex(/^[0-9]{4}$/, "Oppgi gyldig 4-sifret postnummer for byggeplass."),
    durationDays: z.number().int().min(1).max(365),
    urgency: z.enum(["AKUTT_IDAG", "IMORGEN_0700", "DENNE_UKEN", "PLANLAGT_ANBUD"]),
    selectedSkuCode: SkuCodeSchema.optional(),
    rawNeedDescription: z
      .string()
      .trim()
      .min(10, "Beskriv kort maskinbehov, tilkomst eller oppdrag (minst 10 tegn).")
      .max(600, "Beskrivelsen overskrider maks lengde (600 tegn)."),
    calculatorSnapshot: CalculatorSnapshotSchema.optional()
  })
  .strict();

export const LeadDispatchConfirmationSchema = z
  .object({
    leadReferenceId: z.string().regex(/^BF-[0-9]{6}-[A-Z0-9]{4}$/),
    status: z.enum(["ROUTED_EXCLUSIVE_PARTNER", "QUEUED_TERRITORY_DESK"]),
    deliveryChannels: z.array(DeliveryChannelEnum).min(1).max(5),
    selectedSkuCode: SkuCodeSchema.optional(),
    territorySlotKey: z.string().min(4).max(90),
    municipalityName: z.string().min(2).max(80),
    categoryTitle: z.string().min(2).max(90),
    verifiedOrgNr: z.string().regex(/^[89][0-9]{8}$/),
    estimatedContractNokMin: z.number().int().min(1000),
    estimatedContractNokMax: z.number().int().min(1000),
    recommendedSpecSummary: z.string().min(6).max(260),
    complianceChecklist: z.array(z.string().min(4).max(180)).min(1).max(6),
    localLogisticsNote: z.string().min(6).max(240),
    responseSlaMinutes: z.number().int().min(5).max(240)
  })
  .strict();

export const PartnerInquiryRequestSchema = z
  .object({
    orgNr: z
      .string()
      .transform((val) => val.replace(/\s+/g, ""))
      .refine((val) => validateNorwegianOrgNr(val), {
        message: "Oppgi gyldig 9-sifret organisasjonsnummer."
      }),
    companyName: z.string().trim().min(2).max(140),
    contactName: z.string().trim().min(2).max(100),
    email: z.string().trim().email("Oppgi gyldig e-postadresse.").max(140),
    phone: z
      .string()
      .transform((val) => val.replace(/[\s-]/g, ""))
      .refine((val) => /^(\+47)?[2-9][0-9]{7}$/.test(val), {
        message: "Oppgi gyldig norsk telefonnummer."
      }),
    desiredMunicipality: MunicipalitySlugEnum,
    desiredCategory: CategorySlugEnum,
    depotLocation: z.string().trim().min(2).max(120),
    fleetSummary: z.string().trim().min(10).max(500)
  })
  .strict();

export const PartnerInquiryConfirmationSchema = z
  .object({
    applicationId: z.string().regex(/^PARTNER-[0-9]{6}-[A-Z0-9]{4}$/),
    territorySlotKey: z.string().min(4).max(90),
    slotAvailability: z.enum(["AVAILABLE_FOR_EXCLUSIVE_LEASE", "WAITLIST_ONLY"]),
    deliveryChannels: z.array(DeliveryChannelEnum).min(1).max(5).optional(),
    estimatedMonthlyLeadsMin: z.number().int().min(1).max(200),
    estimatedMonthlyLeadsMax: z.number().int().min(1).max(400),
    suggestedMonthlyRetainerNok: z.number().int().min(3000).max(95000),
    nextStepMessage: z.string().min(10).max(260)
  })
  .strict();

export type VerifiedOrgResponse = z.infer<typeof VerifiedOrgResponseSchema>;
export type CalculatorSnapshot = z.infer<typeof CalculatorSnapshotSchema>;
export type LeadSubmissionRequest = z.infer<typeof LeadSubmissionRequestSchema>;
export type LeadDispatchConfirmation = z.infer<typeof LeadDispatchConfirmationSchema>;
export type PartnerInquiryRequest = z.infer<typeof PartnerInquiryRequestSchema>;
export type PartnerInquiryConfirmation = z.infer<typeof PartnerInquiryConfirmationSchema>;

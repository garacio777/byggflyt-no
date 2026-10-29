import { z } from "zod";
import {
  CategorySlugEnum,
  MunicipalitySlugEnum,
  SkuCodeSchema,
  validateNorwegianOrgNr
} from "./directory.js";

export const BusinessStatusEnum = z.enum(["PENDING", "APPROVED", "SUSPENDED"]);
export type BusinessStatus = z.infer<typeof BusinessStatusEnum>;

export const PartnerEquipmentStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type PartnerEquipmentStatus = z.infer<typeof PartnerEquipmentStatusEnum>;

export const TerritoryLeaseStatusEnum = z.enum(["PENDING", "ACTIVE", "REJECTED", "REVOKED"]);
export type TerritoryLeaseStatus = z.infer<typeof TerritoryLeaseStatusEnum>;

export const TerritorySlotAvailabilityEnum = z.enum([
  "AVAILABLE_FOR_EXCLUSIVE_LEASE",
  "LEASED_EXCLUSIVE",
  "WAITLIST_ONLY"
]);
export type TerritorySlotAvailability = z.infer<typeof TerritorySlotAvailabilityEnum>;

export const LeadStageEnum = z.enum(["NEW", "CONTACTED", "QUOTED", "WON", "ARCHIVED"]);
export type LeadStage = z.infer<typeof LeadStageEnum>;

export const NorwegianPhoneField = z
  .string()
  .transform((val) => val.replace(/[\s-]/g, ""))
  .refine((val) => /^(\+47)?[2-9][0-9]{7}$/.test(val), {
    message: "Oppgi gyldig norsk telefonnummer (8 siffer)."
  });

export const OptionalHttpsUrlSchema = z
  .string()
  .trim()
  .max(260)
  .refine((val) => val === "" || val.startsWith("https://"), {
    message: "Webhook-URL må starte med https:// (eller stå tom)."
  });

export const BusinessPublicProfileSchema = z
  .object({
    id: z.string().min(4).max(64),
    orgNr: z.string().regex(/^[89][0-9]{8}$/),
    companyName: z.string().min(2).max(140),
    headline: z.string().min(4).max(160),
    description: z.string().min(10).max(800),
    depotLocation: z.string().min(2).max(120),
    publicPhone: z.string().min(8).max(20),
    publicEmail: z.string().email().max(140),
    municipalities: z.array(MunicipalitySlugEnum).min(1).max(10),
    categories: z.array(CategorySlugEnum).min(1).max(5),
    certifications: z.array(z.string().min(2).max(100)).max(8),
    zeroEmissionFleet: z.boolean(),
    responseSlaMinutes: z.number().int().min(10).max(240),
    featured: z.boolean(),
    verifiedBrreg: z.boolean(),
    activeTerritoriesCount: z.number().int().min(0).max(50),
    createdAt: z.string().min(10).max(40)
  })
  .strict();

export type BusinessPublicProfile = z.infer<typeof BusinessPublicProfileSchema>;

export const BusinessAccountViewSchema = z
  .object({
    id: z.string().min(4).max(64),
    orgNr: z.string().regex(/^[89][0-9]{8}$/),
    companyName: z.string().min(2).max(140),
    contactName: z.string().min(2).max(100),
    email: z.string().email().max(140),
    publicPhone: z.string().min(8).max(20),
    publicEmail: z.string().email().max(140),
    depotLocation: z.string().min(2).max(120),
    headline: z.string().min(4).max(160),
    description: z.string().min(10).max(800),
    municipalities: z.array(MunicipalitySlugEnum).min(1).max(10),
    categories: z.array(CategorySlugEnum).min(1).max(5),
    certifications: z.array(z.string().min(2).max(100)).max(8),
    zeroEmissionFleet: z.boolean(),
    responseSlaMinutes: z.number().int().min(10).max(240),
    webhookUrl: z.string().max(260),
    status: BusinessStatusEnum,
    featured: z.boolean(),
    verifiedBrreg: z.boolean(),
    createdAt: z.string().min(10).max(40)
  })
  .strict();

export type BusinessAccountView = z.infer<typeof BusinessAccountViewSchema>;

export const BusinessRegisterRequestSchema = z
  .object({
    orgNr: z
      .string()
      .transform((val) => val.replace(/\s+/g, ""))
      .refine((val) => validateNorwegianOrgNr(val), {
        message: "Oppgi et gyldig 9-sifret norsk organisasjonsnummer (Modulus-11)."
      }),
    companyName: z.string().trim().min(2, "Firmanavn må fylles ut.").max(140),
    contactName: z.string().trim().min(2, "Kontaktperson må fylles ut.").max(100),
    email: z.string().trim().toLowerCase().email("Oppgi gyldig e-postadresse.").max(140),
    password: z
      .string()
      .min(8, "Passord må være minst 8 tegn.")
      .max(128, "Passord er for langt."),
    phone: NorwegianPhoneField,
    depotLocation: z.string().trim().min(2, "Oppgi adresse eller poststed for depot.").max(120),
    headline: z
      .string()
      .trim()
      .min(6, "Oppgi en kort fagoverskrift (minst 6 tegn).")
      .max(160),
    description: z
      .string()
      .trim()
      .min(15, "Beskriv maskinpark og tjenester (minst 15 tegn).")
      .max(800),
    municipalities: z
      .array(MunicipalitySlugEnum)
      .min(1, "Velg minst én region.")
      .max(10),
    categories: z
      .array(CategorySlugEnum)
      .min(1, "Velg minst ett fagområde.")
      .max(5),
    certifications: z.array(z.string().trim().min(2).max(100)).max(8).default([]),
    zeroEmissionFleet: z.boolean().default(false),
    responseSlaMinutes: z.number().int().min(10).max(240).default(30),
    webhookUrl: OptionalHttpsUrlSchema.default("")
  })
  .strict();

export type BusinessRegisterRequest = z.infer<typeof BusinessRegisterRequestSchema>;

export const BusinessLoginRequestSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Oppgi gyldig e-postadresse.").max(140),
    password: z.string().min(1, "Oppgi passord.").max(128)
  })
  .strict();

export type BusinessLoginRequest = z.infer<typeof BusinessLoginRequestSchema>;

export const BusinessProfileUpdateRequestSchema = z
  .object({
    contactName: z.string().trim().min(2).max(100),
    publicPhone: NorwegianPhoneField,
    publicEmail: z.string().trim().toLowerCase().email().max(140),
    depotLocation: z.string().trim().min(2).max(120),
    headline: z.string().trim().min(6).max(160),
    description: z.string().trim().min(15).max(800),
    municipalities: z.array(MunicipalitySlugEnum).min(1).max(10),
    categories: z.array(CategorySlugEnum).min(1).max(5),
    certifications: z.array(z.string().trim().min(2).max(100)).max(8),
    zeroEmissionFleet: z.boolean(),
    responseSlaMinutes: z.number().int().min(10).max(240),
    webhookUrl: OptionalHttpsUrlSchema
  })
  .strict();

export type BusinessProfileUpdateRequest = z.infer<typeof BusinessProfileUpdateRequestSchema>;

export const PartnerEquipmentItemSchema = z
  .object({
    id: z.string().min(4).max(64),
    businessId: z.string().min(4).max(64),
    businessName: z.string().min(2).max(140),
    municipalitySlug: MunicipalitySlugEnum,
    categorySlug: CategorySlugEnum,
    modelName: z.string().min(4).max(140),
    powertrainLabel: z.string().min(2).max(60),
    zeroEmission: z.boolean(),
    dailyRateNok: z.number().int().min(100).max(250000),
    weeklyRateNok: z.number().int().min(300).max(1000000),
    specsSummary: z.string().min(6).max(280),
    status: PartnerEquipmentStatusEnum,
    createdAt: z.string().min(10).max(40)
  })
  .strict();

export type PartnerEquipmentItem = z.infer<typeof PartnerEquipmentItemSchema>;

export const PartnerEquipmentActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("CREATE"),
      municipalitySlug: MunicipalitySlugEnum,
      categorySlug: CategorySlugEnum,
      modelName: z.string().trim().min(4).max(140),
      powertrainLabel: z.string().trim().min(2).max(60),
      zeroEmission: z.boolean(),
      dailyRateNok: z.number().int().min(100).max(250000),
      weeklyRateNok: z.number().int().min(300).max(1000000),
      specsSummary: z.string().trim().min(6).max(280)
    })
    .strict(),
  z
    .object({
      action: z.literal("DELETE"),
      equipmentId: z.string().min(4).max(64)
    })
    .strict()
]);

export type PartnerEquipmentAction = z.infer<typeof PartnerEquipmentActionSchema>;

export const TerritoryLeaseRecordSchema = z
  .object({
    id: z.string().min(4).max(64),
    slotKey: z.string().min(4).max(90),
    municipalitySlug: MunicipalitySlugEnum,
    categorySlug: CategorySlugEnum,
    businessId: z.string().min(4).max(64),
    businessName: z.string().min(2).max(140),
    businessOrgNr: z.string().regex(/^[89][0-9]{8}$/),
    monthlyNok: z.number().int().min(2000).max(150000),
    status: TerritoryLeaseStatusEnum,
    notes: z.string().max(400),
    createdAt: z.string().min(10).max(40),
    updatedAt: z.string().min(10).max(40)
  })
  .strict();

export type TerritoryLeaseRecord = z.infer<typeof TerritoryLeaseRecordSchema>;

export const PartnerLeaseRequestSchema = z
  .object({
    municipalitySlug: MunicipalitySlugEnum,
    categorySlug: CategorySlugEnum,
    notes: z.string().trim().min(4).max(400)
  })
  .strict();

export type PartnerLeaseRequest = z.infer<typeof PartnerLeaseRequestSchema>;

export const StoredLeadRecordSchema = z
  .object({
    leadReferenceId: z.string().regex(/^BF-[0-9]{6}-[A-Z0-9]{4}$/),
    territorySlotKey: z.string().min(4).max(90),
    municipalitySlug: MunicipalitySlugEnum,
    categorySlug: CategorySlugEnum,
    orgNr: z.string().regex(/^[89][0-9]{8}$/),
    companyName: z.string().min(2).max(140),
    contactName: z.string().min(2).max(100),
    phone: z.string().min(8).max(20),
    postalCode: z.string().regex(/^[0-9]{4}$/),
    durationDays: z.number().int().min(1).max(365),
    urgency: z.enum(["AKUTT_IDAG", "IMORGEN_0700", "DENNE_UKEN", "PLANLAGT_ANBUD"]),
    selectedSkuCode: SkuCodeSchema.optional(),
    rawNeedDescription: z.string().min(4).max(600),
    recommendedSpecSummary: z.string().min(4).max(260),
    estimatedContractNokMin: z.number().int().min(500),
    estimatedContractNokMax: z.number().int().min(500),
    responseSlaMinutes: z.number().int().min(5).max(240),
    assignedBusinessId: z.string().max(64).nullable(),
    assignedBusinessName: z.string().max(140).nullable(),
    routingStatus: z.enum(["ROUTED_EXCLUSIVE_PARTNER", "QUEUED_TERRITORY_DESK"]),
    leadStage: LeadStageEnum,
    partnerNotes: z.string().max(500),
    createdAt: z.string().min(10).max(40)
  })
  .strict();

export type StoredLeadRecord = z.infer<typeof StoredLeadRecordSchema>;

export const PartnerLeadUpdateSchema = z
  .object({
    leadReferenceId: z.string().regex(/^BF-[0-9]{6}-[A-Z0-9]{4}$/),
    leadStage: LeadStageEnum,
    partnerNotes: z.string().trim().max(500)
  })
  .strict();

export type PartnerLeadUpdate = z.infer<typeof PartnerLeadUpdateSchema>;

export const PublicSlotStateSchema = z
  .object({
    slotKey: z.string().min(4).max(90),
    municipalitySlug: MunicipalitySlugEnum,
    categorySlug: CategorySlugEnum,
    monthlyLeaseNok: z.number().int().min(2000).max(150000),
    estMonthlyLeadsMin: z.number().int().min(1).max(300),
    estMonthlyLeadsMax: z.number().int().min(1).max(600),
    availability: TerritorySlotAvailabilityEnum,
    exclusivePartner: BusinessPublicProfileSchema.nullable()
  })
  .strict();

export type PublicSlotState = z.infer<typeof PublicSlotStateSchema>;

export const MunicipalityOverrideItemSchema = z
  .object({
    frostDepthCm: z.number().int().min(40).max(300).optional(),
    designWinterTempC: z.number().int().min(-40).max(5).optional(),
    flatbedTransferNokRange: z.string().min(3).max(80).optional(),
    baseMonthlyTerritoryNok: z.number().int().min(2500).max(95000).optional(),
    emissionPolicySummary: z.string().min(10).max(360).optional(),
    groundConditionProfile: z.string().min(10).max(360).optional()
  })
  .strict();

export const CategoryOverrideItemSchema = z
  .object({
    shortTitle: z.string().min(3).max(80).optional(),
    heroTagline: z.string().min(10).max(280).optional(),
    baseDailyRateNok: z.number().int().min(100).max(150000).optional(),
    typicalTicketRangeNok: z.string().min(5).max(80).optional(),
    retainerMultiplier: z.number().min(0.5).max(3.5).optional()
  })
  .strict();

export const SkuRateOverrideItemSchema = z
  .object({
    dailyRateNok: z.number().int().min(50).max(250000).optional(),
    weeklyRateNok: z.number().int().min(200).max(1000000).optional(),
    monthlyRateNok: z.number().int().min(500).max(3000000).optional(),
    featured: z.boolean().optional(),
    hidden: z.boolean().optional()
  })
  .strict();

export const SiteCmsConfigSchema = z
  .object({
    siteOrigin: z.string().url().max(140),
    announcementBanner: z.string().max(240),
    heroBadgeText: z.string().min(3).max(80),
    heroTitle: z.string().min(10).max(200),
    heroLead: z.string().min(15).max(480),
    partnerCalloutTitle: z.string().min(10).max(180),
    partnerCalloutLead: z.string().min(15).max(360),
    footerTagline: z.string().min(8).max(160),
    autoApproveBusinesses: z.boolean(),
    autoApproveEquipment: z.boolean(),
    autoRouteLeadsToExclusivePartner: z.boolean(),
    municipalityOverrides: z.record(z.string(), MunicipalityOverrideItemSchema),
    categoryOverrides: z.record(z.string(), CategoryOverrideItemSchema),
    slotPriceOverrides: z.record(z.string(), z.number().int().min(2000).max(150000)),
    slotStatusOverrides: z.record(z.string(), TerritorySlotAvailabilityEnum),
    skuRateOverrides: z.record(z.string(), SkuRateOverrideItemSchema)
  })
  .strict();

export type SiteCmsConfig = z.infer<typeof SiteCmsConfigSchema>;

export const PublicCmsSummarySchema = z
  .object({
    announcementBanner: z.string().max(240),
    heroBadgeText: z.string().min(3).max(80),
    heroTitle: z.string().min(10).max(200),
    heroLead: z.string().min(15).max(480),
    partnerCalloutTitle: z.string().min(10).max(180),
    partnerCalloutLead: z.string().min(15).max(360),
    footerTagline: z.string().min(8).max(160)
  })
  .strict();

export type PublicCmsSummary = z.infer<typeof PublicCmsSummarySchema>;

export const PublicDirectoryStateResponseSchema = z
  .object({
    cms: PublicCmsSummarySchema,
    businesses: z.array(BusinessPublicProfileSchema),
    equipment: z.array(PartnerEquipmentItemSchema),
    slots: z.array(PublicSlotStateSchema)
  })
  .strict();

export type PublicDirectoryStateResponse = z.infer<typeof PublicDirectoryStateResponseSchema>;

export const PartnerAuthResponseSchema = z
  .object({
    authenticated: z.literal(true),
    business: BusinessAccountViewSchema
  })
  .strict();

export const PartnerDashboardResponseSchema = z
  .object({
    authenticated: z.literal(true),
    business: BusinessAccountViewSchema,
    leads: z.array(StoredLeadRecordSchema),
    equipment: z.array(PartnerEquipmentItemSchema),
    leases: z.array(TerritoryLeaseRecordSchema),
    slots: z.array(PublicSlotStateSchema)
  })
  .strict();

export type PartnerDashboardResponse = z.infer<typeof PartnerDashboardResponseSchema>;

/* Admin Control Plane Schemas (Port 4322) */
export const AdminLoginRequestSchema = z
  .object({
    username: z.string().trim().min(2).max(80),
    accessCode: z.string().min(4).max(128)
  })
  .strict();

export const AdminRotateAccessSchema = z
  .object({
    currentAccessCode: z.string().min(4).max(128),
    newAccessCode: z.string().min(8, "Ny tilgangskode må være minst 8 tegn.").max(128)
  })
  .strict();

export const AdminBusinessActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("SET_STATUS"),
      businessId: z.string().min(4).max(64),
      status: BusinessStatusEnum,
      featured: z.boolean().optional()
    })
    .strict(),
  z
    .object({
      action: z.literal("UPDATE_DETAILS"),
      businessId: z.string().min(4).max(64),
      companyName: z.string().trim().min(2).max(140),
      contactName: z.string().trim().min(2).max(100),
      publicPhone: NorwegianPhoneField,
      publicEmail: z.string().trim().toLowerCase().email().max(140),
      depotLocation: z.string().trim().min(2).max(120),
      headline: z.string().trim().min(4).max(160),
      description: z.string().trim().min(10).max(800),
      municipalities: z.array(MunicipalitySlugEnum).min(1).max(10),
      categories: z.array(CategorySlugEnum).min(1).max(5),
      certifications: z.array(z.string().trim().min(2).max(100)).max(8),
      zeroEmissionFleet: z.boolean(),
      responseSlaMinutes: z.number().int().min(10).max(240),
      webhookUrl: OptionalHttpsUrlSchema,
      featured: z.boolean(),
      status: BusinessStatusEnum
    })
    .strict(),
  z
    .object({
      action: z.literal("RESET_PARTNER_ACCESS"),
      businessId: z.string().min(4).max(64),
      newPassword: z.string().min(8).max(128)
    })
    .strict(),
  z
    .object({
      action: z.literal("DELETE"),
      businessId: z.string().min(4).max(64)
    })
    .strict()
]);

export const AdminTerritoryActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("SET_LEASE_STATUS"),
      leaseId: z.string().min(4).max(64),
      status: TerritoryLeaseStatusEnum,
      monthlyNok: z.number().int().min(2000).max(150000).optional()
    })
    .strict(),
  z
    .object({
      action: z.literal("ASSIGN_EXCLUSIVE"),
      municipalitySlug: MunicipalitySlugEnum,
      categorySlug: CategorySlugEnum,
      businessId: z.string().min(4).max(64),
      monthlyNok: z.number().int().min(2000).max(150000),
      notes: z.string().trim().max(400).default("")
    })
    .strict(),
  z
    .object({
      action: z.literal("CONFIGURE_SLOT"),
      slotKey: z.string().min(4).max(90),
      monthlyLeaseNok: z.number().int().min(2000).max(150000).optional(),
      availabilityOverride: z
        .enum(["AUTO", "AVAILABLE_FOR_EXCLUSIVE_LEASE", "WAITLIST_ONLY"])
        .optional()
    })
    .strict()
]);

export const AdminLeadActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("ASSIGN_PARTNER"),
      leadReferenceId: z.string().regex(/^BF-[0-9]{6}-[A-Z0-9]{4}$/),
      businessId: z.string().max(64).nullable(),
      triggerWebhook: z.boolean().default(false)
    })
    .strict(),
  z
    .object({
      action: z.literal("UPDATE_STAGE"),
      leadReferenceId: z.string().regex(/^BF-[0-9]{6}-[A-Z0-9]{4}$/),
      leadStage: LeadStageEnum,
      partnerNotes: z.string().trim().max(500)
    })
    .strict(),
  z
    .object({
      action: z.literal("DELETE"),
      leadReferenceId: z.string().regex(/^BF-[0-9]{6}-[A-Z0-9]{4}$/)
    })
    .strict()
]);

export const AdminEquipmentActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("MODERATE_PARTNER_ITEM"),
      equipmentId: z.string().min(4).max(64),
      status: PartnerEquipmentStatusEnum
    })
    .strict(),
  z
    .object({
      action: z.literal("DELETE_PARTNER_ITEM"),
      equipmentId: z.string().min(4).max(64)
    })
    .strict(),
  z
    .object({
      action: z.literal("OVERRIDE_CORE_SKU"),
      skuCode: SkuCodeSchema,
      dailyRateNok: z.number().int().min(50).max(250000),
      weeklyRateNok: z.number().int().min(200).max(1000000),
      monthlyRateNok: z.number().int().min(500).max(3000000),
      featured: z.boolean(),
      hidden: z.boolean()
    })
    .strict()
]);

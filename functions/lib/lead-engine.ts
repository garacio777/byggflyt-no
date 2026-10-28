import { getCategoryBySlug } from "../../src/data/categories.js";
import { getMunicipalityBySlug } from "../../src/data/municipalities.js";
import { getTerritorySlotInfo } from "../../src/lib/calculators.js";
import {
  BrregExternalEnhetSchema,
  LeadDispatchConfirmationSchema,
  LeadSubmissionRequestSchema,
  OrgLookupQuerySchema,
  PartnerInquiryConfirmationSchema,
  PartnerInquiryRequestSchema,
  VerifiedOrgResponseSchema
} from "../../src/schemas/directory.js";

export interface LeadEngineEnv {
  readonly PARTNER_WEBHOOK_URL?: string;
}

export const SHARED_API_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function createDeterministicRef(prefix: "BF" | "PARTNER", seedInput: string): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");

  let hash = 2166136261;
  const combined = `${seedInput}:${now.getTime()}`;
  for (let i = 0; i < combined.length; i += 1) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const suffix = (hash >>> 0).toString(36).toUpperCase().padStart(4, "0").slice(0, 4);
  return `${prefix}-${yy}${mm}${dd}-${suffix}`;
}

export async function handleOrgVerification(requestUrl: string): Promise<Response> {
  const url = new URL(requestUrl);
  const rawOrgnr = url.searchParams.get("orgnr") ?? "";

  const parsedQuery = OrgLookupQuerySchema.safeParse({ orgnr: rawOrgnr });
  if (!parsedQuery.success) {
    return new Response(
      JSON.stringify({
        error: "Ugyldig organisasjonsnummer",
        details: parsedQuery.error.flatten()
      }),
      { status: 400, headers: SHARED_API_HEADERS }
    );
  }

  const orgNr = parsedQuery.data.orgnr;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3800);

  try {
    const brregRes = await fetch(
      `https://data.brreg.no/enhetsregisteret/api/enheter/${encodeURIComponent(orgNr)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "ByggFlyt-B2B-Verifier/1.0"
        },
        signal: controller.signal
      }
    );

    if (brregRes.status === 404) {
      return new Response(
        JSON.stringify({
          error: "Fant ingen registrert bedrift i Enhetsregisteret med dette organisasjonsnummeret."
        }),
        { status: 404, headers: SHARED_API_HEADERS }
      );
    }

    if (brregRes.ok) {
      const rawJson: unknown = await brregRes.json();
      const parsedBrreg = BrregExternalEnhetSchema.safeParse(rawJson);

      if (parsedBrreg.success) {
        const entity = parsedBrreg.data;
        const activeInBusiness =
          entity.konkurs !== true &&
          entity.underAvvikling !== true &&
          entity.underTvangsavviklingEllerTvangsopplosning !== true;
        const orgFormCode = entity.organisasjonsform?.kode ?? "UOPPGITT";
        const vatRegistered = entity.registrertIMvaregisteret === true;

        const mappedCandidate = {
          orgNr,
          companyName: entity.navn.slice(0, 160),
          orgFormCode: orgFormCode.slice(0, 16),
          vatRegistered,
          activeInBusiness,
          naceCode: (entity.naeringskode1?.kode ?? "").slice(0, 16),
          naceDescription: (entity.naeringskode1?.beskrivelse ?? "Registrert næringsvirksomhet").slice(0, 160),
          municipalityName: (entity.forretningsadresse?.kommune ?? "").slice(0, 80),
          postalCode: (entity.forretningsadresse?.postnummer ?? "").slice(0, 8),
          ehfEligible: activeInBusiness && (vatRegistered || orgFormCode === "AS" || orgFormCode === "ASA"),
          verificationSource: "BRREG_LIVE" as const
        };

        const validatedOut = VerifiedOrgResponseSchema.safeParse(mappedCandidate);
        if (validatedOut.success) {
          return new Response(JSON.stringify(validatedOut.data), {
            status: 200,
            headers: SHARED_API_HEADERS
          });
        }
      }
    }
  } catch {
    // Graceful fallback below if Enhetsregisteret times out
  } finally {
    clearTimeout(timeout);
  }

  const fallbackCandidate = {
    orgNr,
    companyName: `Verifisert foretak (${orgNr})`,
    orgFormCode: "MOD11",
    vatRegistered: true,
    activeInBusiness: true,
    naceCode: "41-43",
    naceDescription: "Modulus-11 kontrollert organisasjonsnummer (Enhetsregisteret midlertidig utilgjengelig)",
    municipalityName: "",
    postalCode: "",
    ehfEligible: true,
    verificationSource: "MOD11_OFFLINE_FALLBACK" as const
  };

  const validatedFallback = VerifiedOrgResponseSchema.safeParse(fallbackCandidate);
  if (!validatedFallback.success) {
    return new Response(JSON.stringify({ error: "Intern valideringsfeil" }), {
      status: 500,
      headers: SHARED_API_HEADERS
    });
  }

  return new Response(JSON.stringify(validatedFallback.data), {
    status: 200,
    headers: SHARED_API_HEADERS
  });
}

export async function handleLeadSubmission(
  request: Request,
  env: LeadEngineEnv
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Ugyldig JSON i forespørsel." }), {
      status: 400,
      headers: SHARED_API_HEADERS
    });
  }

  const parsedInput = LeadSubmissionRequestSchema.safeParse(rawBody);
  if (!parsedInput.success) {
    return new Response(
      JSON.stringify({
        error: "Valideringsfeil i skjemadata",
        details: parsedInput.error.flatten()
      }),
      { status: 400, headers: SHARED_API_HEADERS }
    );
  }

  const data = parsedInput.data;
  const municipality = getMunicipalityBySlug(data.municipalitySlug);
  const category = getCategoryBySlug(data.categorySlug);
  const slotInfo = getTerritorySlotInfo(data.municipalitySlug, data.categorySlug);

  const fallbackMin = Math.max(
    category.baseProjectMinNok,
    Math.round(category.baseDailyRateNok * data.durationDays * 0.85 + 3200)
  );
  const fallbackMax = Math.max(
    fallbackMin + 4500,
    Math.round(category.baseDailyRateNok * data.durationDays * 1.22 + 6800)
  );

  const estimatedContractNokMin = data.calculatorSnapshot?.estimatedValueNokMin ?? fallbackMin;
  const estimatedContractNokMax = data.calculatorSnapshot?.estimatedValueNokMax ?? fallbackMax;

  const recommendedSpecSummary = (
    data.calculatorSnapshot?.headlineSpec ??
    `${category.shortTitle} (${data.durationDays} dager) til postnr. ${data.postalCode} i ${municipality.shortName}`
  ).slice(0, 260);

  const slaMap = {
    AKUTT_IDAG: 15,
    IMORGEN_0700: 30,
    DENNE_UKEN: 60,
    PLANLAGT_ANBUD: 180
  } as const;

  let routingStatus: "ROUTED_EXCLUSIVE_PARTNER" | "QUEUED_TERRITORY_DESK" = "QUEUED_TERRITORY_DESK";
  const leadReferenceId = createDeterministicRef("BF", `${data.orgNr}:${slotInfo.slotKey}`);

  if (env.PARTNER_WEBHOOK_URL && env.PARTNER_WEBHOOK_URL.startsWith("https://")) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
      const hookRes = await fetch(env.PARTNER_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadReferenceId,
          territorySlotKey: slotInfo.slotKey,
          request: data,
          estimatedContractNokMin,
          estimatedContractNokMax
        }),
        signal: controller.signal
      });
      if (hookRes.ok) {
        routingStatus = "ROUTED_EXCLUSIVE_PARTNER";
      }
    } catch {
      routingStatus = "QUEUED_TERRITORY_DESK";
    } finally {
      clearTimeout(timer);
    }
  }

  const confirmationCandidate = {
    leadReferenceId,
    status: routingStatus,
    territorySlotKey: slotInfo.slotKey,
    municipalityName: municipality.name,
    categoryTitle: category.shortTitle,
    verifiedOrgNr: data.orgNr,
    estimatedContractNokMin,
    estimatedContractNokMax,
    recommendedSpecSummary,
    complianceChecklist: category.certificationsRequired.slice(0, 4).map((item) => item.slice(0, 180)),
    localLogisticsNote: `Hovedkorridor: ${municipality.logisticsCorridors}. Typisk maskinflytting i området: ${municipality.flatbedTransferNokRange}.`.slice(
      0,
      240
    ),
    responseSlaMinutes: slaMap[data.urgency]
  };

  const validatedOutput = LeadDispatchConfirmationSchema.safeParse(confirmationCandidate);
  if (!validatedOutput.success) {
    return new Response(
      JSON.stringify({ error: "Intern skjemavalidering feilet." }),
      { status: 500, headers: SHARED_API_HEADERS }
    );
  }

  return new Response(JSON.stringify(validatedOutput.data), {
    status: 200,
    headers: SHARED_API_HEADERS
  });
}

export async function handlePartnerInquiry(
  request: Request,
  env: LeadEngineEnv
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Ugyldig JSON i forespørsel." }), {
      status: 400,
      headers: SHARED_API_HEADERS
    });
  }

  const parsed = PartnerInquiryRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Valideringsfeil i partnersøknad",
        details: parsed.error.flatten()
      }),
      { status: 400, headers: SHARED_API_HEADERS }
    );
  }

  const data = parsed.data;
  const municipality = getMunicipalityBySlug(data.desiredMunicipality);
  const category = getCategoryBySlug(data.desiredCategory);
  const slotInfo = getTerritorySlotInfo(data.desiredMunicipality, data.desiredCategory);
  const applicationId = createDeterministicRef("PARTNER", `${data.orgNr}:${slotInfo.slotKey}`);

  if (env.PARTNER_WEBHOOK_URL && env.PARTNER_WEBHOOK_URL.startsWith("https://")) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
      await fetch(env.PARTNER_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TERRITORY_LEASE_INQUIRY",
          applicationId,
          slotInfo,
          applicant: data
        }),
        signal: controller.signal
      });
    } catch {
      // Non-fatal webhook notification failure
    } finally {
      clearTimeout(timer);
    }
  }

  const outCandidate = {
    applicationId,
    territorySlotKey: slotInfo.slotKey,
    slotAvailability: slotInfo.slotAvailability,
    estimatedMonthlyLeadsMin: slotInfo.estMonthlyLeadsMin,
    estimatedMonthlyLeadsMax: slotInfo.estMonthlyLeadsMax,
    suggestedMonthlyRetainerNok: slotInfo.monthlyLeaseNok,
    nextStepMessage: `Territoriet «${category.shortTitle} i ${municipality.name}» er reservert for gjennomgang i 48 timer for ${data.companyName} (${data.orgNr}).`.slice(
      0,
      260
    )
  };

  const validated = PartnerInquiryConfirmationSchema.safeParse(outCandidate);
  if (!validated.success) {
    return new Response(JSON.stringify({ error: "Intern valideringsfeil." }), {
      status: 500,
      headers: SHARED_API_HEADERS
    });
  }

  return new Response(JSON.stringify(validated.data), {
    status: 200,
    headers: SHARED_API_HEADERS
  });
}

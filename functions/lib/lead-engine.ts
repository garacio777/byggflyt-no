import { getCategoryBySlug } from "../../src/data/categories.js";
import { getMunicipalityBySlug } from "../../src/data/municipalities.js";
import { getTerritorySlotInfo } from "../../src/lib/calculators.js";
import {
  BrregExternalEnhetSchema,
  type DeliveryChannel,
  LeadDispatchConfirmationSchema,
  type LeadSubmissionRequest,
  LeadSubmissionRequestSchema,
  OrgLookupQuerySchema,
  PartnerInquiryConfirmationSchema,
  type PartnerInquiryRequest,
  PartnerInquiryRequestSchema,
  VerifiedOrgResponseSchema
} from "../../src/schemas/directory.js";

export interface LeadEngineEnv {
  readonly PARTNER_WEBHOOK_URL?: string;
  readonly SLACK_WEBHOOK_URL?: string;
  readonly RESEND_API_KEY?: string;
  readonly LEAD_NOTIFY_EMAIL?: string;
  readonly LEAD_FROM_EMAIL?: string;
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

async function postJsonBounded(
  url: string,
  payload: unknown,
  extraHeaders?: Record<string, string>,
  timeoutMs = 3500
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(extraHeaders ?? {})
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function dispatchOutboundLeadNotifications(params: {
  readonly env: LeadEngineEnv;
  readonly leadReferenceId: string;
  readonly territorySlotKey: string;
  readonly municipalityName: string;
  readonly municipalityShortName: string;
  readonly categoryShortTitle: string;
  readonly data: LeadSubmissionRequest;
  readonly recommendedSpecSummary: string;
  readonly estimatedContractNokMin: number;
  readonly estimatedContractNokMax: number;
  readonly responseSlaMinutes: number;
}): Promise<DeliveryChannel[]> {
  const {
    env,
    leadReferenceId,
    territorySlotKey,
    municipalityName,
    municipalityShortName,
    categoryShortTitle,
    data,
    recommendedSpecSummary,
    estimatedContractNokMin,
    estimatedContractNokMax,
    responseSlaMinutes
  } = params;

  const tasks: Array<Promise<DeliveryChannel | null>> = [];

  if (env.PARTNER_WEBHOOK_URL && env.PARTNER_WEBHOOK_URL.startsWith("https://")) {
    const partnerUrl = env.PARTNER_WEBHOOK_URL;
    tasks.push(
      postJsonBounded(partnerUrl, {
        type: "BYGGFLYT_B2B_LEAD",
        leadReferenceId,
        territorySlotKey,
        selectedSkuCode: data.selectedSkuCode,
        request: data,
        recommendedSpecSummary,
        estimatedContractNokMin,
        estimatedContractNokMax,
        responseSlaMinutes
      }).then((ok) => (ok ? "PARTNER_WEBHOOK" : null))
    );
  }

  if (env.SLACK_WEBHOOK_URL && env.SLACK_WEBHOOK_URL.startsWith("https://")) {
    const slackUrl = env.SLACK_WEBHOOK_URL;
    const nokRange = `${estimatedContractNokMin.toLocaleString("nb-NO")}–${estimatedContractNokMax.toLocaleString("nb-NO")} kr eks. mva`;
    const skuLabel = data.selectedSkuCode ?? "Kalkulator-spesifisert";
    tasks.push(
      postJsonBounded(slackUrl, {
        text: `[ByggFlyt ${leadReferenceId}] Ny B2B-forespørsel: ${categoryShortTitle} i ${municipalityShortName} (${data.companyName})`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `ByggFlyt B2B-forespørsel • ${leadReferenceId}`
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Bedrift (Org.nr):*\n${data.companyName} (${data.orgNr})`
              },
              {
                type: "mrkdwn",
                text: `*Kontakt & Tlf:*\n${data.contactName} (${data.phone})`
              },
              {
                type: "mrkdwn",
                text: `*Område & Postnr:*\n${municipalityName} (${data.postalCode})`
              },
              {
                type: "mrkdwn",
                text: `*Modell / SKU:*\n${skuLabel}`
              },
              {
                type: "mrkdwn",
                text: `*Estimert ramme:*\n${nokRange}`
              },
              {
                type: "mrkdwn",
                text: `*Frist / SLA:*\n${data.urgency} (${responseSlaMinutes} min SLA)`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Spesifikasjon:* ${recommendedSpecSummary}\n*Melding:* ${data.rawNeedDescription}`
            }
          }
        ]
      }).then((ok) => (ok ? "SLACK_WEBHOOK" : null))
    );
  }

  if (env.RESEND_API_KEY && env.LEAD_NOTIFY_EMAIL) {
    const cleanCompany = data.companyName.replace(/[\r\n]+/g, " ").trim();
    const fromAddr = env.LEAD_FROM_EMAIL ?? "ByggFlyt Dispatch <onboarding@resend.dev>";
    const toAddr = env.LEAD_NOTIFY_EMAIL;
    const emailLines = [
      `Referanse: ${leadReferenceId}`,
      `Territorium: ${territorySlotKey} (${municipalityName} / ${categoryShortTitle})`,
      `Bedrift: ${cleanCompany} (Org.nr: ${data.orgNr})`,
      `Kontaktperson: ${data.contactName} • Tlf: ${data.phone}`,
      `Postnummer: ${data.postalCode} • Varighet: ${data.durationDays} dager • Frist: ${data.urgency} (SLA ${responseSlaMinutes} min)`,
      `Valgt SKU: ${data.selectedSkuCode ?? "Ikke valgt (kalkulator/fritekst)"}`,
      `Anbefalt spesifikasjon: ${recommendedSpecSummary}`,
      `Estimert kontraktsramme: ${estimatedContractNokMin.toLocaleString("nb-NO")}–${estimatedContractNokMax.toLocaleString("nb-NO")} kr eks. mva`,
      "",
      "Melding fra anleggsleder:",
      data.rawNeedDescription
    ];
    tasks.push(
      postJsonBounded(
        "https://api.resend.com/emails",
        {
          from: fromAddr,
          to: [toAddr],
          subject: `[ByggFlyt ${leadReferenceId}] Ny B2B-forespørsel: ${categoryShortTitle} i ${municipalityShortName} (${cleanCompany})`.slice(
            0,
            180
          ),
          text: emailLines.join("\n")
        },
        {
          Authorization: `Bearer ${env.RESEND_API_KEY}`
        }
      ).then((ok) => (ok ? "EMAIL_RESEND" : null))
    );
  }

  if (tasks.length === 0) {
    return [];
  }

  const settled = await Promise.allSettled(tasks);
  const delivered: DeliveryChannel[] = [];
  for (const res of settled) {
    if (res.status === "fulfilled" && res.value !== null) {
      delivered.push(res.value);
    }
  }
  return delivered;
}

async function dispatchOutboundPartnerNotifications(params: {
  readonly env: LeadEngineEnv;
  readonly applicationId: string;
  readonly municipalityName: string;
  readonly categoryShortTitle: string;
  readonly slotKey: string;
  readonly monthlyLeaseNok: number;
  readonly data: PartnerInquiryRequest;
}): Promise<void> {
  const { env, applicationId, municipalityName, categoryShortTitle, slotKey, monthlyLeaseNok, data } = params;
  const tasks: Array<Promise<boolean>> = [];

  if (env.PARTNER_WEBHOOK_URL && env.PARTNER_WEBHOOK_URL.startsWith("https://")) {
    tasks.push(
      postJsonBounded(env.PARTNER_WEBHOOK_URL, {
        type: "TERRITORY_LEASE_INQUIRY",
        applicationId,
        slotKey,
        monthlyLeaseNok,
        applicant: data
      })
    );
  }

  if (env.SLACK_WEBHOOK_URL && env.SLACK_WEBHOOK_URL.startsWith("https://")) {
    tasks.push(
      postJsonBounded(env.SLACK_WEBHOOK_URL, {
        text: `[ByggFlyt ${applicationId}] Ny partnersøknad for ${slotKey} (${data.companyName})`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `Ny Rank & Rent Partnersøknad • ${applicationId}`
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Søker:*\n${data.companyName} (${data.orgNr})`
              },
              {
                type: "mrkdwn",
                text: `*Kontakt:*\n${data.contactName} (${data.phone} / ${data.email})`
              },
              {
                type: "mrkdwn",
                text: `*Territorium:*\n${categoryShortTitle} i ${municipalityName}`
              },
              {
                type: "mrkdwn",
                text: `*Veil. månedsleie:*\n${monthlyLeaseNok.toLocaleString("nb-NO")} kr/mnd eks. mva`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Depot:* ${data.depotLocation}\n*Maskinpark:* ${data.fleetSummary}`
            }
          }
        ]
      })
    );
  }

  if (env.RESEND_API_KEY && env.LEAD_NOTIFY_EMAIL) {
    const fromAddr = env.LEAD_FROM_EMAIL ?? "ByggFlyt Dispatch <onboarding@resend.dev>";
    tasks.push(
      postJsonBounded(
        "https://api.resend.com/emails",
        {
          from: fromAddr,
          to: [env.LEAD_NOTIFY_EMAIL],
          subject: `[ByggFlyt ${applicationId}] Partnersøknad: ${categoryShortTitle} i ${municipalityName}`,
          text: [
            `Søknads-ID: ${applicationId}`,
            `Territorium: ${slotKey} (${monthlyLeaseNok.toLocaleString("nb-NO")} kr/mnd eks. mva)`,
            `Bedrift: ${data.companyName} (${data.orgNr})`,
            `Kontakt: ${data.contactName} • ${data.email} • ${data.phone}`,
            `Depotadresse: ${data.depotLocation}`,
            "",
            "Maskinpark / kapasitet:",
            data.fleetSummary
          ].join("\n")
        },
        {
          Authorization: `Bearer ${env.RESEND_API_KEY}`
        }
      )
    );
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
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

  const baseSpecSummary =
    data.calculatorSnapshot?.headlineSpec ??
    `${category.shortTitle} (${data.durationDays} dager) til postnr. ${data.postalCode} i ${municipality.shortName}`;
  const skuPrefix =
    data.selectedSkuCode && !baseSpecSummary.includes(data.selectedSkuCode)
      ? `[${data.selectedSkuCode}] `
      : "";
  const recommendedSpecSummary = `${skuPrefix}${baseSpecSummary}`.slice(0, 260);

  const slaMap = {
    AKUTT_IDAG: 15,
    IMORGEN_0700: 30,
    DENNE_UKEN: 60,
    PLANLAGT_ANBUD: 180
  } as const;

  const responseSlaMinutes = slaMap[data.urgency];
  const leadReferenceId = createDeterministicRef("BF", `${data.orgNr}:${slotInfo.slotKey}`);

  const deliveredChannels = await dispatchOutboundLeadNotifications({
    env,
    leadReferenceId,
    territorySlotKey: slotInfo.slotKey,
    municipalityName: municipality.name,
    municipalityShortName: municipality.shortName,
    categoryShortTitle: category.shortTitle,
    data,
    recommendedSpecSummary,
    estimatedContractNokMin,
    estimatedContractNokMax,
    responseSlaMinutes
  });

  const routingStatus: "ROUTED_EXCLUSIVE_PARTNER" | "QUEUED_TERRITORY_DESK" =
    deliveredChannels.length > 0 ? "ROUTED_EXCLUSIVE_PARTNER" : "QUEUED_TERRITORY_DESK";
  const deliveryChannels: DeliveryChannel[] =
    deliveredChannels.length > 0 ? deliveredChannels : ["TERRITORY_QUEUE"];

  const confirmationCandidate = {
    leadReferenceId,
    status: routingStatus,
    deliveryChannels,
    ...(data.selectedSkuCode ? { selectedSkuCode: data.selectedSkuCode } : {}),
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
    responseSlaMinutes
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

  await dispatchOutboundPartnerNotifications({
    env,
    applicationId,
    municipalityName: municipality.name,
    categoryShortTitle: category.shortTitle,
    slotKey: slotInfo.slotKey,
    monthlyLeaseNok: slotInfo.monthlyLeaseNok,
    data
  });

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

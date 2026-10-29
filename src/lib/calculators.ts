import type { CategorySlug, MunicipalitySlug } from "../schemas/directory.js";
import { getCategoryBySlug } from "../data/categories.js";
import { getStaticCmsConfig } from "../data/cms-loader.js";
import { getMunicipalityBySlug } from "../data/municipalities.js";

export interface ExcavatorCalcInput {
  readonly trenchDepthMeters: number;
  readonly layerThicknessCm: number;
  readonly gateWidthCm: number;
  readonly zeroEmissionRequired: boolean;
  readonly durationDays: number;
}

export interface LiftCalcInput {
  readonly workingHeightMeters: number;
  readonly horizontalOutreachMeters: number;
  readonly surfaceType: "GARASJEDEKKE" | "ASFALT_BETONG" | "TERRENG_LEIRE" | "INNENDORS_GULV";
  readonly gateWidthCm: number;
  readonly durationDays: number;
}

export interface WinterHeatCalcInput {
  readonly areaSqm: number;
  readonly frostDepthCm: number;
  readonly ambientTempC: number;
  readonly groundType: "VAAT_LEIRE" | "MORENE_PUKK" | "BETONGHERDING";
  readonly durationDays: number;
}

export interface SitePowerCalcInput {
  readonly crewCount: number;
  readonly gridFuseAmps: 32 | 63 | 125;
  readonly electricMachinesCount: number;
  readonly heatingLoadKw: number;
  readonly fenceMeters: number;
  readonly durationDays: number;
}

export interface MassWasteCalcInput {
  readonly areaSqm: number;
  readonly thicknessCm: number;
  readonly materialType: "PUKK_8_16" | "BAERELAG_0_32" | "KULT_20_120" | "UTGRAVD_LEIRE";
  readonly buildingBraSqm: number;
}

export interface UnifiedCalcOutput {
  readonly calculatorType: CategorySlug;
  readonly headlineSpec: string;
  readonly keyMetrics: readonly { readonly label: string; readonly value: string }[];
  readonly estimatedValueNokMin: number;
  readonly estimatedValueNokMax: number;
  readonly complianceSummary: string;
  readonly prefilledOrderText: string;
}

export function calculateExcavatorSpec(input: ExcavatorCalcInput): UnifiedCalcOutput {
  const depth = Math.max(0.4, Math.min(6.5, input.trenchDepthMeters));
  const layerCm = Math.max(10, Math.min(80, input.layerThicknessCm));
  const gateCm = Math.max(70, Math.min(400, input.gateWidthCm));
  const days = Math.max(1, Math.min(180, Math.round(input.durationDays)));

  let machineClass = "8,5t korthekker beltegraver";
  let dailyRate = 3400;

  if (gateCm <= 95) {
    machineClass = "1,0t mikrograver med innsmalbart understell (75–90 cm)";
    dailyRate = 1750;
  } else if (depth <= 1.6 && gateCm <= 155) {
    machineClass = "1,8t–2,7t kompakt minigraver";
    dailyRate = 2150;
  } else if (depth <= 2.8) {
    machineClass = "5,5t–8,5t korthekker med tiltrotator";
    dailyRate = 3450;
  } else if (depth <= 4.2) {
    machineClass = "14t beltegraver med grøfteskuffe og pusseskuffe";
    dailyRate = 4850;
  } else {
    machineClass = "21t–25t anleggsgraver + grøftekasse/sikring";
    dailyRate = 6400;
  }

  const driveLabel = input.zeroEmissionRequired
    ? "Batterielektrisk (utslippsfri)"
    : "Stage V / HVO100-klar";
  if (input.zeroEmissionRequired) {
    dailyRate = Math.round(dailyRate * 1.28);
  }

  let compactorSpec = "90 kg vibroplate";
  if (layerCm > 45) {
    compactorSpec = "450–500 kg reversibel vibroplate";
  } else if (layerCm > 25) {
    compactorSpec = "250 kg reversibel vibroplate";
  }

  const transportCost = gateCm <= 155 ? 3200 : 6800;
  const discountFactor = days >= 10 ? 0.82 : days >= 5 ? 0.9 : 1;
  const estMin = Math.max(4500, Math.round((dailyRate * days * discountFactor + transportCost) * 0.9));
  const estMax = Math.round((dailyRate * days * discountFactor + transportCost + 650 * days) * 1.18);

  const depthSafety =
    depth >= 2.0
      ? "Grøft ≥ 2,0 m utløser skjerpet krav til grøftesikring/skråning (Arbeidstilsynet) + M2 førerbevis."
      : "Krever godkjent gravemelding/kabelpåvisning og M2 maskinførerbevis (>15 kW).";

  const headlineSpec = `${machineClass} (${driveLabel}) + ${compactorSpec}`;

  return {
    calculatorType: "maskinutleie",
    headlineSpec,
    keyMetrics: [
      { label: "Anbefalt maskin", value: machineClass },
      { label: "Drivlinje", value: driveLabel },
      { label: "Komprimering", value: `${compactorSpec} (${layerCm} cm lag)` },
      { label: "Budsjettindikasjon", value: `${estMin.toLocaleString("nb-NO")} – ${estMax.toLocaleString("nb-NO")} kr` }
    ],
    estimatedValueNokMin: estMin,
    estimatedValueNokMax: estMax,
    complianceSummary: depthSafety,
    prefilledOrderText: `Trenger ${machineClass} (${driveLabel}) og ${compactorSpec} for grøft/arbeidsdybde ${depth.toFixed(1)} m (port/passasje ${gateCm} cm) i ${days} dager.`
  };
}

export function calculateLiftSpec(input: LiftCalcInput): UnifiedCalcOutput {
  const height = Math.max(4, Math.min(34, input.workingHeightMeters));
  const outreach = Math.max(0, Math.min(20, input.horizontalOutreachMeters));
  const gateCm = Math.max(75, Math.min(400, input.gateWidthCm));
  const days = Math.max(1, Math.min(180, Math.round(input.durationDays)));

  let machineSpec = "10 m elektrisk sakslift (avmerkingsfrie hjul)";
  let groundPressure = "12–16 kN/m² (bruk trykkfordelingsplater ved dekke)";
  let courseCode = "Personløfterkurs kl. A";
  let dailyRate = 1250;

  if (input.surfaceType === "GARASJEDEKKE" || gateCm <= 105) {
    machineSpec = `Beltegående edderkopplift ${Math.max(13, Math.round(height))} m (lav egenvekt, hybrid/230V)`;
    groundPressure = "Lav flatebelastning (~5–9 kN/m² med støttebensplater)";
    courseCode = "Personløfterkurs kl. B/C + fallsikringssele";
    dailyRate = 2950;
  } else if (outreach >= 3 || input.surfaceType === "TERRENG_LEIRE") {
    const drive = input.surfaceType === "INNENDORS_GULV" ? "elektrisk" : "4WD hybrid/terreng";
    machineSpec = `${Math.max(12, Math.round(height))} m ${drive} ledd-/teleskopbomlift (${outreach.toFixed(1)} m utlegg)`;
    groundPressure = "18–26 kN/m² under hjul — krev støtteplater på belegningsstein/leire";
    courseCode = "Personløfterkurs kl. B + påbudt fallsikringssele i kurv";
    dailyRate = height >= 20 ? 3400 : 2350;
  } else if (days >= 21 && height <= 18 && input.surfaceType !== "INNENDORS_GULV") {
    machineSpec = `Fasadestillas kl. 3 (${Math.round(height)} m arbeidshøyde) inkl. montering/grønt kort`;
    groundPressure = "Fordelt via fotplater og underlagsplank";
    courseCode = height > 9 ? "Stillaskurs § 17-4 (>9 m)" : "Stillaskurs § 17-3 (5–9 m)";
    dailyRate = 1650;
  } else {
    machineSpec = `${Math.max(8, Math.round(height))} m elektrisk sakslift`;
    dailyRate = height >= 12 ? 1650 : 1150;
  }

  const transport = 3400;
  const discount = days >= 7 ? 0.84 : 1;
  const estMin = Math.max(4000, Math.round((dailyRate * days * discount + transport) * 0.92));
  const estMax = Math.round((dailyRate * days * discount + transport + 1800) * 1.2);

  return {
    calculatorType: "lift-og-stillas",
    headlineSpec: machineSpec,
    keyMetrics: [
      { label: "Anbefalt løsning", value: machineSpec },
      { label: "Marktrykk-vurdering", value: groundPressure },
      { label: "Lovpålagt kompetanse", value: courseCode },
      { label: "Budsjettindikasjon", value: `${estMin.toLocaleString("nb-NO")} – ${estMax.toLocaleString("nb-NO")} kr` }
    ],
    estimatedValueNokMin: estMin,
    estimatedValueNokMax: estMax,
    complianceSummary: `Krav: ${courseCode} samt gyldig årskontroll før bruk.`,
    prefilledOrderText: `Behov for ${machineSpec} (arbeidshøyde ${height} m, horisontalt utlegg ${outreach} m, underlag: ${input.surfaceType.toLowerCase()}) i ${days} dager.`
  };
}

export function calculateWinterHeatSpec(input: WinterHeatCalcInput): UnifiedCalcOutput {
  const area = Math.max(10, Math.min(1500, input.areaSqm));
  const frostCm = Math.max(10, Math.min(220, input.frostDepthCm));
  const tempC = Math.max(-30, Math.min(5, input.ambientTempC));
  const days = Math.max(2, Math.min(120, Math.round(input.durationDays)));

  const coldMultiplier = tempC <= -18 ? 1.35 : tempC <= -10 ? 1.18 : 1.0;
  const soilKwPerSqm =
    input.groundType === "VAAT_LEIRE" ? 0.36 : input.groundType === "MORENE_PUKK" ? 0.27 : 0.22;
  const requiredKw = Math.max(18, Math.ceil(area * soilKwPerSqm * coldMultiplier));

  const cmPerDay = input.groundType === "VAAT_LEIRE" ? 26 : 34;
  const estThawHours =
    input.groundType === "BETONGHERDING"
      ? 72
      : Math.max(18, Math.ceil((frostCm / cmPerDay) * 24 * coldMultiplier));

  const matsCount = Math.max(2, Math.ceil(area / 12));
  let unitSpec = "1 stk. 36 kW elektrisk byggtørker / kompakt teletiner";
  let dailyRate = 1950;
  if (requiredKw > 105) {
    const units = Math.ceil(requiredKw / 95);
    unitSpec = `${units} stk. 95–105 kW væskebårne teletinere + ${matsCount} isolasjonsmatter`;
    dailyRate = units * 3600;
  } else if (requiredKw > 45) {
    unitSpec = `1 stk. 70–103 kW væskebåren teletiner + ${matsCount} isolasjonsmatter`;
    dailyRate = 3450;
  } else {
    unitSpec = `1 stk. 35–45 kW teletiner/byggvarmer + ${matsCount} isolasjonsmatter`;
    dailyRate = 2450;
  }

  const estMin = Math.round((dailyRate * days + 3800) * 0.92);
  const estMax = Math.round((dailyRate * days + 6500 + requiredKw * 18 * days) * 1.15);

  return {
    calculatorType: "vintervarme-og-teletining",
    headlineSpec: `${unitSpec} (${requiredKw} kW beregnet effektbehov)`,
    keyMetrics: [
      { label: "Beregnet effektbehov", value: `${requiredKw} kW ved ${tempC} °C` },
      { label: "Estimert tinetid", value: `ca. ${estThawHours} timer (${frostCm} cm tele)` },
      { label: "Isolasjonsmatter", value: `${matsCount} stk. vintermatter (ca. ${area} m²)` },
      { label: "Budsjettindikasjon", value: `${estMin.toLocaleString("nb-NO")} – ${estMax.toLocaleString("nb-NO")} kr` }
    ],
    estimatedValueNokMin: estMin,
    estimatedValueNokMax: estMax,
    complianceSummary:
      "Dekk sløyfer med isolasjonsmatter for å redusere varmetap med opptil 60 %. Bruk HVO100 eller 400V strøm på utslippsfrie byggeplasser.",
    prefilledOrderText: `Trenger ${unitSpec} (${requiredKw} kW) for ${area} m² (${frostCm} cm dybde ved ${tempC} °C) i ${days} dager.`
  };
}

export function calculateSitePowerSpec(input: SitePowerCalcInput): UnifiedCalcOutput {
  const crew = Math.max(2, Math.min(80, Math.round(input.crewCount)));
  const elMachines = Math.max(0, Math.min(8, Math.round(input.electricMachinesCount)));
  const heatKw = Math.max(0, Math.min(250, input.heatingLoadKw));
  const fenceMeters = Math.max(0, Math.min(2000, Math.round(input.fenceMeters)));
  const days = Math.max(5, Math.min(365, Math.round(input.durationDays)));

  // 3-phase 400V available continuous power: sqrt(3) * 400V * Amps * 0.92 / 1000
  const availableGridKw = Math.round(1.732 * 0.4 * input.gridFuseAmps * 0.92);
  const cabinBaseKw = Math.ceil(crew / 6) * 6;
  const chargingPeakKw = elMachines * 28;
  const peakDemandKw = cabinBaseKw + chargingPeakKw + heatKw + 4;
  const deficitKw = Math.max(0, peakDemandKw - availableGridKw);

  const bessRecommendation =
    deficitKw > 0
      ? `Mobil batteribank (BESS ${Math.max(60, deficitKw * 3)} kWh) kreves for peak-shaving over ${input.gridFuseAmps}A`
      : `${input.gridFuseAmps}A 400V byggestrømskap dekker beregnet maksuttak (${peakDemandKw} kW)`;

  const cabinSpec =
    crew <= 6
      ? "6-manns mannskapsvogn (spise/skift/WC)"
      : crew <= 12
        ? "12-manns brakkerigg med skille skittent/rent"
        : `${Math.ceil(crew / 10)} stk. brakkemoduler (${crew} pers) med garderobe og tørkerom`;

  const fencePanels = Math.ceil(fenceMeters / 3.5);
  const dailyRigRate =
    (deficitKw > 0 ? 2900 : 850) + (crew <= 6 ? 780 : crew <= 12 ? 1450 : 2600) + fencePanels * 6;
  const estMin = Math.round((dailyRigRate * days * 0.85 + 7500) * 0.9);
  const estMax = Math.round((dailyRigRate * days + 14500) * 1.15);

  return {
    calculatorType: "byggestrom-og-utslippsfri-rigg",
    headlineSpec: `${cabinSpec} + ${bessRecommendation}`,
    keyMetrics: [
      { label: "Topplast vs. nett", value: `${peakDemandKw} kW behov / ${availableGridKw} kW (${input.gridFuseAmps}A)` },
      { label: "Strøm / Batteribank", value: bessRecommendation },
      { label: "Brakke & Gjerde", value: `${cabinSpec}, ${fencePanels} gjerdeelementer` },
      { label: "Budsjettindikasjon", value: `${estMin.toLocaleString("nb-NO")} – ${estMax.toLocaleString("nb-NO")} kr` }
    ],
    estimatedValueNokMin: estMin,
    estimatedValueNokMax: estMax,
    complianceSummary:
      "Krever samsvarserklæring (NEK 400) ved nettilkobling og adskilt skittent/rent skifterom ved grunn- eller rivingsarbeid.",
    prefilledOrderText: `Dag-1 riggpakke for ${crew} arbeidere i ${days} dager: ${cabinSpec}, ${bessRecommendation}, og ${fencePanels} stk. byggegjerdeelementer (${fenceMeters} m).`
  };
}

export function calculateMassWasteSpec(input: MassWasteCalcInput): UnifiedCalcOutput {
  const area = Math.max(5, Math.min(5000, input.areaSqm));
  const thicknessCm = Math.max(5, Math.min(200, input.thicknessCm));
  const bra = Math.max(0, Math.min(25000, input.buildingBraSqm));

  const solidCubicMeters = (area * thicknessCm) / 100;

  const densityMap = {
    PUKK_8_16: { label: "Pukk 8/16 mm", swell: 1.25, tonsPerSolidM3: 1.65 },
    BAERELAG_0_32: { label: "Bærelag 0/32 mm", swell: 1.28, tonsPerSolidM3: 1.95 },
    KULT_20_120: { label: "Kult / sprengstein 20/120", swell: 1.42, tonsPerSolidM3: 1.85 },
    UTGRAVD_LEIRE: { label: "Utgravd leire / jordmasser", swell: 1.35, tonsPerSolidM3: 1.8 }
  } as const;

  const mat = densityMap[input.materialType];
  const looseCubicMeters = solidCubicMeters * mat.swell;
  const totalTons = Math.max(1, Math.ceil(solidCubicMeters * mat.tonsPerSolidM3));
  const boggiLoads = Math.max(1, Math.ceil(totalTons / 13));
  const semiLoads = Math.max(1, Math.ceil(totalTons / 28));

  const tek17Mandatory = bra >= 300 || totalTons >= 10;
  const containerSpec =
    input.materialType === "UTGRAVD_LEIRE"
      ? `${boggiLoads} boggilass bortkjøring eller 10 m³ forsterket massecontainer`
      : `${totalTons} tonn ${mat.label} (${boggiLoads} boggilass / ${semiLoads} semilass) + 22 m³ kildesorteringscontainer`;

  const estMin = Math.max(4800, Math.round(totalTons * 235 + boggiLoads * 2600));
  const estMax = Math.round(totalTons * 340 + boggiLoads * 3800 + (bra >= 300 ? 9500 : 3500));

  const complianceSummary = tek17Mandatory
    ? "TEK17 § 9-6 utløst (>300 m² BRA eller >10 tonn): Krav om avfallsplan, sluttrapport og minst 70 % kildesorteringsgrad."
    : "Sorter rene masser, betong og trevirke separat for å unngå feilsorteringsgebyr på mottak.";

  return {
    calculatorType: "container-kranbil-og-masse",
    headlineSpec: containerSpec,
    keyMetrics: [
      { label: "Fast vs. løst volum", value: `${solidCubicMeters.toFixed(1)} fm³ → ${looseCubicMeters.toFixed(1)} lm³` },
      { label: "Beregnet vekt", value: `ca. ${totalTons} tonn (${mat.label})` },
      { label: "Transportkapasitet", value: `${boggiLoads} boggilass (13t) / ${semiLoads} semilass (28t)` },
      { label: "Budsjettindikasjon", value: `${estMin.toLocaleString("nb-NO")} – ${estMax.toLocaleString("nb-NO")} kr` }
    ],
    estimatedValueNokMin: estMin,
    estimatedValueNokMax: estMax,
    complianceSummary,
    prefilledOrderText: `Forespørsel på ${containerSpec} (${solidCubicMeters.toFixed(1)} fm³ / ca. ${totalTons} tonn, BRA ${bra} m²).`
  };
}

export interface TerritorySlotInfo {
  readonly slotKey: string;
  readonly municipalitySlug: MunicipalitySlug;
  readonly categorySlug: CategorySlug;
  readonly monthlyLeaseNok: number;
  readonly estMonthlyLeadsMin: number;
  readonly estMonthlyLeadsMax: number;
  readonly slotAvailability: "AVAILABLE_FOR_EXCLUSIVE_LEASE" | "WAITLIST_ONLY";
}

export function getTerritorySlotInfo(
  municipalitySlug: MunicipalitySlug,
  categorySlug: CategorySlug
): TerritorySlotInfo {
  const municipality = getMunicipalityBySlug(municipalitySlug);
  const category = getCategoryBySlug(categorySlug);
  const cms = getStaticCmsConfig();
  const slotKey = `${municipalitySlug}__${categorySlug}`;
  const computedMonthlyNok =
    Math.round((municipality.baseMonthlyTerritoryNok * category.retainerMultiplier) / 100) * 100;
  const monthlyLeaseNok = cms.slotPriceOverrides[slotKey] ?? computedMonthlyNok;

  const demandBase = Math.round(municipality.baseMonthlyTerritoryNok / 950);
  const estMonthlyLeadsMin = Math.max(5, demandBase);
  const estMonthlyLeadsMax = Math.max(11, Math.round(demandBase * 2.1));

  const statusOverride = cms.slotStatusOverrides[slotKey];
  const slotAvailability: "AVAILABLE_FOR_EXCLUSIVE_LEASE" | "WAITLIST_ONLY" =
    statusOverride === "WAITLIST_ONLY" || statusOverride === "LEASED_EXCLUSIVE"
      ? "WAITLIST_ONLY"
      : "AVAILABLE_FOR_EXCLUSIVE_LEASE";

  return {
    slotKey,
    municipalitySlug,
    categorySlug,
    monthlyLeaseNok,
    estMonthlyLeadsMin,
    estMonthlyLeadsMax,
    slotAvailability
  };
}

import type { CategorySlug } from "../schemas/directory.js";
import { getStaticCmsConfig } from "./cms-loader.js";

export interface CategoryProfile {
  readonly slug: CategorySlug;
  readonly title: string;
  readonly shortTitle: string;
  readonly badgeCode: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly telemetrySpecs: readonly string[];
  readonly heroTagline: string;
  readonly calculatorTitle: string;
  readonly calculatorSubtitle: string;
  readonly typicalTicketRangeNok: string;
  readonly baseProjectMinNok: number;
  readonly baseProjectMaxNok: number;
  readonly baseDailyRateNok: number;
  readonly certificationsRequired: readonly string[];
  readonly equipmentExamples: readonly string[];
  readonly painPointsSolved: readonly string[];
  readonly retainerMultiplier: number;
}

export const BASE_CATEGORIES: readonly CategoryProfile[] = [
  {
    slug: "maskinutleie",
    title: "Maskinutleie, Gravemaskin og Komprimering",
    shortTitle: "Maskinutleie & Graving",
    badgeCode: "M2 / M4 / KOMP",
    imageSrc: "/images/cat-maskinutleie.webp",
    imageAlt:
      "8,5-tonns korthekker beltegraver med tiltrotator og tung reversibel vibroplate på norsk anleggsplass",
    telemetrySpecs: ["1,0–25 tonn", "El / Stage V", "Vibro 90–500 kg"],
    heroTagline:
      "Riktig tonnasje, skuffepakke og vibroplate levert på klokkeslett — både elektriske anleggsmaskiner og Stage V beltegravere.",
    calculatorTitle: "Gravemaskin- & Komprimerings-velger",
    calculatorSubtitle:
      "Beregn anbefalt maskinklasse (tonn), vibroplate-vekt (kg) og transportbehov ut fra grøftedybde, grunnforhold og portbredde.",
    typicalTicketRangeNok: "14 000 – 185 000 kr eks. mva",
    baseProjectMinNok: 14000,
    baseProjectMaxNok: 95000,
    baseDailyRateNok: 3400,
    certificationsRequired: [
      "Maskinførerbevis M2 (gravemaskin > 15 kW) / M4 (hjullaster)",
      "Årlig sakkyndig kontroll (sertifikat i maskinmappe)",
      "Gravemelding / kabelpåvisning før graving"
    ],
    equipmentExamples: [
      "1,8t–2,7t minigraver (også batterielektrisk)",
      "5,5t–8,5t korthekker beltegraver med tiltrotator",
      "14t–22t anleggsgraver med GPS maskinstyring",
      "Hjullaster 5t–12t og belte-/hjuldumper",
      "Vibroplater 90–500 kg (frem/tilbake) og grøftevalser"
    ],
    painPointsSolved: [
      "Unngå bomtur med for bred maskin i bakgård eller for lett vibroplate på tykt bærelag",
      "Kort maskinflytting fra nærmeste lokale depot på Østlandet",
      "Valg mellom nullutslipp (el-graver) og HVO100/Stage V på sekunder"
    ],
    retainerMultiplier: 1.25
  },
  {
    slug: "lift-og-stillas",
    title: "Liftutleie, Personløfter og Fasadestillas",
    shortTitle: "Lift & Stillas",
    badgeCode: "A / B / C / §17",
    imageSrc: "/images/cat-lift-og-stillas.webp",
    imageAlt:
      "16 meter 4WD leddbomlift, elektrisk sakslift og fasadestillas i aluminium montert ved næringsbygg",
    telemetrySpecs: ["6–34 m høyde", "Marktrykk kN/m²", "4WD / Edderkopp"],
    heroTagline:
      "Dimensjoner arbeidshøyde, utlegg og maks marktrykk før transportbilen ruller ut — inkludert HMS-krav etter Arbeidstilsynet.",
    calculatorTitle: "Lift-, Stillas- & Marktrykk-velger",
    calculatorSubtitle:
      "Sjekk arbeidshøyde, horisontal rekkevidde og underlag (dekke over garasje, asfalt eller terreng) for å unngå dekkeskader og feillevering.",
    typicalTicketRangeNok: "9 500 – 140 000 kr eks. mva",
    baseProjectMinNok: 9500,
    baseProjectMaxNok: 78000,
    baseDailyRateNok: 2100,
    certificationsRequired: [
      "Personløfterkurs klasse A (sakslift), B (selvgående bom) eller C (tilhenger/bil)",
      "Stillaskurs § 17-2 (2–5m), § 17-3 (5–9m) eller § 17-4 (>9m) + grønt kort",
      "Fallsikringsutstyr i bomlift (krav til sele og kort line)"
    ],
    equipmentExamples: [
      "Elektrisk sakslift 6–14 m med avmerkingsfrie hjul",
      "4WD ledd- og teleskopbomlift 16–28 m (hybrid/el/diesel)",
      "Beltegående edderkopplift med lav egenvekt for sårbare dekker",
      "Tilhengerlift 12–21 m for rask egenhenting med BE-førerkort",
      "Fasadestillas kl. 3, rullestillas og taksikring ferdig montert"
    ],
    painPointsSolved: [
      "Stopper 12 000 kr i feiltransport når underlaget ikke tåler punktlasten",
      "Avklarer med en gang om oppdraget krever edderkopplift, 4WD bomlift eller fasadestillas",
      "Dokumenterer nøyaktig kurskrav for mannskapet på plassen"
    ],
    retainerMultiplier: 1.15
  },
  {
    slug: "vintervarme-og-teletining",
    title: "Vinterbygg: Teletining, Byggvarme og Byggtørk",
    shortTitle: "Vintervarme & Teletining",
    badgeCode: "VINTER / KW",
    imageSrc: "/images/cat-vintervarme.webp",
    imageAlt:
      "Tilhengermontert væskebåren teletiner koblet til gule isolasjonsmatter på frossen norsk vinterbyggeplass",
    telemetrySpecs: ["35–150 kW", "Væskebåren tele", "-22 °C dimensjonert"],
    heroTagline:
      "Null ståtid mandag kl. 07:00: beregn nøyaktig kW-effekt, tinetid og antall matter for frossen leire, betongherding og råbygg.",
    calculatorTitle: "Teletining- & Byggvarme-kalkulator (kW)",
    calculatorSubtitle:
      "Regn ut nødvendig varmeeffekt (kW), glykolmaskin-kapasitet og estimert tinetid ut fra areal, teledybde og utetemperatur.",
    typicalTicketRangeNok: "18 000 – 160 000 kr eks. mva",
    baseProjectMinNok: 18000,
    baseProjectMaxNok: 110000,
    baseDailyRateNok: 2900,
    certificationsRequired: [
      "Sertifikat for varme arbeider der åpen/direktefyrt kilde vurderes",
      "CO/avgass-sikring ved indirekte varmluftsaggregat og slangeføring inn i bygg",
      "Jordfeilvern og godkjent byggestrømsfordeling ved elektriske byggtørkere"
    ],
    equipmentExamples: [
      "Væskebårne teletinere 35–105 kW med isolerte slangesløyfer og matter",
      "Elektriske byggtørkere og vifteovner 9–36 kW (400V)",
      "Indirektefyrte HVO100/biofyrings-varmeaggregater 45–150 kW",
      "Kondens- og adsorpsjonsavfuktere for fuktkontroll før lukking av bygg",
      "Isolasjonsmatter og vintermatter for nystøpt betong"
    ],
    painPointsSolved: [
      "Unngår underdimensjonert byggvarme når kulda faller til -18 °C på Østlandet",
      "Beregner realistisk antall timer før grøfta faktisk er gravbar",
      "Sammenligner elektrisk drift mot HVO100/væskebåren tining"
    ],
    retainerMultiplier: 1.2
  },
  {
    slug: "byggestrom-og-utslippsfri-rigg",
    title: "Byggestrøm, Batteribank (BESS) og Dag-1 Brakkerigg",
    shortTitle: "Byggestrøm & Brakkerigg",
    badgeCode: "NEK 400 / BESS",
    imageSrc: "/images/cat-byggestrom-rigg.webp",
    imageAlt:
      "Mobil batteribank BESS koblet til gult 400V byggestrømskap ved moderne mannskapsvogn og byggegjerde",
    telemetrySpecs: ["32A–250A 400V", "BESS 45–300 kWh", "4–24 pers rigg"],
    heroTagline:
      "Unngå at 63A-sikringen ryker når el-graver og byggvarme går samtidig — dimensjoner byggestrøm, batteribank og mannskapsvogn i ett steg.",
    calculatorTitle: "Utslippsfri Byggestrøm- & Brakkerigg-beregner",
    calculatorSubtitle:
      "Sjekk effektbalanse (kW) mot tilgjengelig nettsikring (32A/63A/125A), behov for mobil batteribank og Arbeidstilsynets krav til brakkerigg.",
    typicalTicketRangeNok: "35 000 – 320 000 kr eks. mva",
    baseProjectMinNok: 35000,
    baseProjectMaxNok: 220000,
    baseDailyRateNok: 2600,
    certificationsRequired: [
      "NEK 400 / FEL-samsvarserklæring fra registrert elektroinstallatør ved tilkobling av byggestrømskasse",
      "Arbeidsplassforskriften kap. 3 krav til spise- og skifterom (skille rent/skittent ved grunn-/rivingsarbeid)",
      "Sikring av byggeplass med byggegjerde og adgangskontroll (Byggherreforskriften)"
    ],
    equipmentExamples: [
      "Byggestrømskap og underfordelinger 32A / 63A / 125A / 250A (400V)",
      "Mobile battericontainere (BESS 45–300 kWh) for effekttopper og hurtiglading",
      "Støysvake HVO100 nødstrømsaggregater med automatisk start",
      "Mannskapsvogner og brakkemoduler for 4–24 personer",
      "Byggegjerder (3,5 m elementer), kjøreporter, lysmaster og mobile toaletter"
    ],
    painPointsSolved: [
      "Gir ferdig effekt- og batteriberegning klar til vedlegg i offentlige anbud med miljøkrav",
      "Samler brakke, gjerde, lysmast og strømskap i én leveranse istedenfor fem telefoner",
      "Avslører umiddelbart om 63A byggestrøm holder eller krever peak-shaving"
    ],
    retainerMultiplier: 1.35
  },
  {
    slug: "container-kranbil-og-masse",
    title: "Containerutleie, Kranbil og Pukk/Masselevering (TEK17)",
    shortTitle: "Container, Kranbil & Masse",
    badgeCode: "TEK17 ≥70%",
    imageSrc: "/images/cat-container-masse.webp",
    imageAlt:
      "Krokcontainer for kildesortering og kranbil som løfter storsekk med pukk på byggeplass",
    telemetrySpecs: ["8–35 m³ krok/lift", "Boggi 13t / Semi 28t", "Kran 26–95 tm"],
    heroTagline:
      "Regn om fastmasse til løsmasse, tonn pukk og riktig containerfraksjon — slipp feilsorteringsgebyr og unødvendige bomturer med tippbil.",
    calculatorTitle: "Masse-, Tippbil- & TEK17 Container-kalkulator",
    calculatorSubtitle:
      "Beregn eksakt tonnasje pukk/kult/utgravd masse, antall boggi-/semilass og krav til avfallsplan (TEK17 § 9-6 med minst 70 % kildesortering).",
    typicalTicketRangeNok: "8 500 – 95 000 kr eks. mva",
    baseProjectMinNok: 8500,
    baseProjectMaxNok: 68000,
    baseDailyRateNok: 1800,
    certificationsRequired: [
      "TEK17 § 9-6 avfallsplan og sluttrapport (≥ 70 % sorteringsgrad ved tiltak over 300 m² BRA eller > 10 tonn avfall)",
      "Deklarering av farlig avfall via Avfallsdeklarering.no (asbest, PCB-vinduer, impregnert trevirke)",
      "G8 lastebilkran-sertifikat og anhukerkurs ved kranbilsmontering"
    ],
    equipmentExamples: [
      "8–10 m³ åpne og lukkede liftcontainere for tunge masser, betong og tegl",
      "20–35 m³ krokcontainere for trevirke, gips, isolasjon og blandet avfall",
      "Levering av pukk 8/16, bærelag 0/32, kult 20/120 og singel med tippbil eller grabb/kranbil",
      "Kranbil 26–95 tm for løft av takstoler, brakkemoduler og storsekk (bigbag)",
      "Sugerør/grabb-tjenester i trange bygårder"
    ],
    painPointsSolved: [
      "Eliminerer 4 000–8 000 kr i feilsorteringsgebyr ved å skille tunge masser fra blandet avfall",
      "Beregner svellfaktor mellom fast kubikk (fm³) og løs kubikk (lm³) automatisk",
      "Varsler når prosjektet utløser lovpålagt TEK17 avfallsplan"
    ],
    retainerMultiplier: 1.05
  }
] as const;

export const CATEGORIES: readonly CategoryProfile[] = BASE_CATEGORIES.map((cat) => {
  const cms = getStaticCmsConfig();
  const ov = cms.categoryOverrides[cat.slug];
  if (!ov) return cat;
  return {
    ...cat,
    shortTitle: ov.shortTitle ?? cat.shortTitle,
    heroTagline: ov.heroTagline ?? cat.heroTagline,
    baseDailyRateNok: ov.baseDailyRateNok ?? cat.baseDailyRateNok,
    typicalTicketRangeNok: ov.typicalTicketRangeNok ?? cat.typicalTicketRangeNok,
    retainerMultiplier: ov.retainerMultiplier ?? cat.retainerMultiplier
  };
});

export function getCategoryBySlug(slug: CategorySlug): CategoryProfile {
  const match = CATEGORIES.find((item) => item.slug === slug);
  if (!match) {
    throw new Error(`Unknown category slug: ${slug}`);
  }
  return match;
}

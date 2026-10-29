import type { CategorySlug } from "../schemas/directory.js";
import { getStaticCmsConfig } from "./cms-loader.js";

export interface EquipmentSkuSpecRow {
  readonly label: string;
  readonly value: string;
}

export interface EquipmentSku {
  readonly skuCode: string;
  readonly categorySlug: CategorySlug;
  readonly classLabel: string;
  readonly name: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly powertrainLabel: string;
  readonly zeroEmission: boolean;
  readonly capacityTier: "COMPACT" | "MEDIUM" | "HEAVY";
  readonly featured: boolean;
  readonly dailyRateNok: number;
  readonly weeklyRateNok: number;
  readonly monthlyRateNok: number;
  readonly specs: readonly [
    EquipmentSkuSpecRow,
    EquipmentSkuSpecRow,
    EquipmentSkuSpecRow,
    EquipmentSkuSpecRow
  ];
  readonly certificationBadge: string;
  readonly prefilledOrderLine: string;
}

export const BASE_EQUIPMENT_SKUS: readonly EquipmentSku[] = [
  // 1. MASKINUTLEIE (4 SKUs)
  {
    skuCode: "SKU-EX-025EL",
    categorySlug: "maskinutleie",
    classLabel: "Minigraver • Utslippsfri",
    name: "2,6t Elektrisk Minigraver m/ hydr. pusseskuffe",
    imageSrc: "/images/sku-minigraver-el.webp",
    imageAlt: "2,6 tonns batterielektrisk minigraver på byggeplass",
    powertrainLabel: "100 % Elektrisk",
    zeroEmission: true,
    capacityTier: "COMPACT",
    featured: true,
    dailyRateNok: 2650,
    weeklyRateNok: 10900,
    monthlyRateNok: 34500,
    specs: [
      { label: "Driftsvekt", value: "2 680 kg" },
      { label: "Maks gravedybde", value: "2,82 m" },
      { label: "Bredde / tilkomst", value: "150 cm" },
      { label: "Batteri / lading", value: "48V Li-Ion • hurtiglader 400V" }
    ],
    certificationBadge: "Kompetansekrav: M2 maskinførerbevis (> 15 kW) • Nullutslipp",
    prefilledOrderLine: "2,6t elektrisk minigraver m/ pusseskuffe og hurtiglader levert kl. 07:00."
  },
  {
    skuCode: "SKU-EX-085T",
    categorySlug: "maskinutleie",
    classLabel: "Korthekker Beltegraver",
    name: "8,5t Korthekker Beltegraver m/ tiltrotator & GPS",
    imageSrc: "/images/cat-maskinutleie.webp",
    imageAlt: "8,5 tonns korthekker beltegraver med tiltrotator",
    powertrainLabel: "Stage V / HVO100",
    zeroEmission: false,
    capacityTier: "MEDIUM",
    featured: true,
    dailyRateNok: 3950,
    weeklyRateNok: 16800,
    monthlyRateNok: 52900,
    specs: [
      { label: "Driftsvekt", value: "8 650 kg" },
      { label: "Maks gravedybde", value: "4,35 m" },
      { label: "Bredde", value: "232 cm (korthekk)" },
      { label: "Utstyr", value: "S45 tiltrotator + 3 skuffer" }
    ],
    certificationBadge: "Kompetansekrav: M2 maskinførerbevis + godkjent gravemelding",
    prefilledOrderLine: "8,5t korthekker beltegraver m/ S45 tiltrotator og skuffepakke til VA-/tomtegraving."
  },
  {
    skuCode: "SKU-EX-150T",
    categorySlug: "maskinutleie",
    classLabel: "Anleggsgraver • Tung",
    name: "15t Anleggsgraver Stage V m/ 3D maskinstyring",
    imageSrc: "/images/cat-maskinutleie.webp",
    imageAlt: "15 tonns Stage V beltegraver for tyngre grunnarbeid",
    powertrainLabel: "Stage V / HVO100",
    zeroEmission: false,
    capacityTier: "HEAVY",
    featured: false,
    dailyRateNok: 5400,
    weeklyRateNok: 22900,
    monthlyRateNok: 71500,
    specs: [
      { label: "Driftsvekt", value: "15 400 kg" },
      { label: "Maks gravedybde", value: "5,55 m" },
      { label: "Maskinstyring", value: "3D GNSS ferdig kalibrert" },
      { label: "Transport", value: "Leveres på maskinsemi" }
    ],
    certificationBadge: "Kompetansekrav: M2 maskinførerbevis + årlig sakkyndig kontroll",
    prefilledOrderLine: "15t Stage V beltegraver m/ 3D maskinstyring og tiltrotator til hovedgrøft/tomt."
  },
  {
    skuCode: "SKU-VP-450KG",
    categorySlug: "maskinutleie",
    classLabel: "Komprimering • Reversibel",
    name: "450 kg Reversibel Vibroplate m/ komprimeringsmåler",
    imageSrc: "/images/sku-vibroplate-450.webp",
    imageAlt: "450 kg tung reversibel vibroplate på knust bærelag",
    powertrainLabel: "Stage V / HVO100",
    zeroEmission: false,
    capacityTier: "COMPACT",
    featured: false,
    dailyRateNok: 990,
    weeklyRateNok: 3950,
    monthlyRateNok: 11900,
    specs: [
      { label: "Egenvekt", value: "455 kg" },
      { label: "Sentrifugalkraft", value: "60 kN" },
      { label: "Platebredde", value: "65 cm" },
      { label: "Lagtykkelse pukk", value: "Opptil 45 cm pr. overfart" }
    ],
    certificationBadge: "HMS: Dokumentert utstyrsopplæring + vibrasjonshansker/hørselvern",
    prefilledOrderLine: "450 kg reversibel vibroplate (60 kN) for komprimering av bærelag og grøft."
  },

  // 2. LIFT OG STILLAS (4 SKUs)
  {
    skuCode: "SKU-LF-10EL",
    categorySlug: "lift-og-stillas",
    classLabel: "Sakselift • Innendørs/Dekke",
    name: "10 m Elektrisk Smalsakselift (81 cm bredde)",
    imageSrc: "/images/sku-sakslift-10m.webp",
    imageAlt: "10 meter elektrisk sakselift med avsvertingsfrie hjul",
    powertrainLabel: "100 % Elektrisk",
    zeroEmission: true,
    capacityTier: "COMPACT",
    featured: true,
    dailyRateNok: 1150,
    weeklyRateNok: 4300,
    monthlyRateNok: 12400,
    specs: [
      { label: "Arbeidshøyde", value: "10,0 m" },
      { label: "Maskinbredde", value: "81 cm (går gjennom dør)" },
      { label: "Kurvkapasitet", value: "230 kg" },
      { label: "Egenvekt", value: "2 180 kg (avsvertingsfri)" }
    ],
    certificationBadge: "Kompetansekrav: Dokumentert personløfterkurs kl. A + fallsikring",
    prefilledOrderLine: "10 m elektrisk smalsakselift (81 cm, hvite hjul) levert klar til innvendig montasje."
  },
  {
    skuCode: "SKU-LF-16BOM",
    categorySlug: "lift-og-stillas",
    classLabel: "Leddbomlift • 4x4 Terreng",
    name: "16 m 4x4 Batteri/Hybrid Leddbomlift",
    imageSrc: "/images/cat-lift-og-stillas.webp",
    imageAlt: "16 meter terrenggående leddbomlift ved fasade og stillas",
    powertrainLabel: "100 % Elektrisk 4x4",
    zeroEmission: true,
    capacityTier: "MEDIUM",
    featured: false,
    dailyRateNok: 2450,
    weeklyRateNok: 9600,
    monthlyRateNok: 27900,
    specs: [
      { label: "Arbeidshøyde", value: "16,0 m" },
      { label: "Horisontal rekkevidde", value: "9,1 m" },
      { label: "Kurvkapasitet", value: "250 kg" },
      { label: "Drivlinje", value: "48V 4x4 terrenghjul" }
    ],
    certificationBadge: "Kompetansekrav: Personløfter kl. B + fallsikringssele i kurv",
    prefilledOrderLine: "16 m 4x4 elektrisk leddbomlift (9,1 m utlegg) til utvendig fasadearbeid."
  },
  {
    skuCode: "SKU-LF-22SPID",
    categorySlug: "lift-og-stillas",
    classLabel: "Edderkopplift • Lavt marktrykk",
    name: "22 m Beltegående Edderkopplift (Garasjedekke)",
    imageSrc: "/images/sku-edderkopplift.webp",
    imageAlt: "22 meter edderkopplift på støttebein i trang bygård",
    powertrainLabel: "230V / Li-Ion Hybrid",
    zeroEmission: true,
    capacityTier: "HEAVY",
    featured: false,
    dailyRateNok: 3650,
    weeklyRateNok: 14800,
    monthlyRateNok: 43500,
    specs: [
      { label: "Arbeidshøyde", value: "21,8 m" },
      { label: "Transportbredde", value: "98 cm" },
      { label: "Egenvekt", value: "2 950 kg (lavt dekke-trykk)" },
      { label: "Støttebein", value: "Automatisk nivellering" }
    ],
    certificationBadge: "Kompetansekrav: Personløfter kl. B + underlagsplater for dekke",
    prefilledOrderLine: "22 m beltegående edderkopplift (lav egenvekt 2 950 kg) for bakgård/garasjedekke."
  },
  {
    skuCode: "SKU-ST-250FAS",
    categorySlug: "lift-og-stillas",
    classLabel: "Fasadestillas • Klasse 3",
    name: "250 m² Komplett Aluminium Fasadestillas m/ trappetårn",
    imageSrc: "/images/cat-lift-og-stillas.webp",
    imageAlt: "Ferdig montert aluminium fasadestillas med grønt kontrollskilt",
    powertrainLabel: "Mekanisk • Klasse 3",
    zeroEmission: false,
    capacityTier: "HEAVY",
    featured: false,
    dailyRateNok: 1450,
    weeklyRateNok: 5800,
    monthlyRateNok: 17900,
    specs: [
      { label: "Dekningsflate", value: "250 m² fasadeareal" },
      { label: "Lastklasse", value: "Klasse 3 (200 kg/m²)" },
      { label: "Adkomst", value: "Innvendig trappeløp inkl." },
      { label: "Dokumentasjon", value: "Grønt skilt iht. § 17-8" }
    ],
    certificationBadge: "Produsentforskriften: Ferdigattest og grønt skilt (> 9 m kurs ved montasje)",
    prefilledOrderLine: "250 m² klasse 3 fasadestillas m/ trappetårn levert og ferdig kontrollert med grønt skilt."
  },

  // 3. VINTERVARME OG TELETINING (4 SKUs)
  {
    skuCode: "SKU-VV-38TIN",
    categorySlug: "vintervarme-og-teletining",
    classLabel: "Væskebåren Teletining",
    name: "38 kW Mobil Teletiner (opptil 120 m² teledybde)",
    imageSrc: "/images/cat-vintervarme.webp",
    imageAlt: "Mobil væskebåren teletiner med sløyfer og isolasjonsmatter i snø",
    powertrainLabel: "HVO100 / Hybrid 230V",
    zeroEmission: false,
    capacityTier: "MEDIUM",
    featured: true,
    dailyRateNok: 2450,
    weeklyRateNok: 10400,
    monthlyRateNok: 32900,
    specs: [
      { label: "Termisk effekt", value: "38 kW væskebåren" },
      { label: "Tinekapasitet", value: "Opptil 120 m² / 35 cm pr. døgn" },
      { label: "Slangesløyfer", value: "3 x 230 m inkl. vintermatter" },
      { label: "Drivstoff", value: "Sertifisert HVO100 biodiesel" }
    ],
    certificationBadge: "Brannvern: ADR-godkjent intern tank + avstandskrav varmt utstyr",
    prefilledOrderLine: "38 kW væskebåren teletiner m/ vintermatter levert fylt med HVO100 til frossen grøft/såle."
  },
  {
    skuCode: "SKU-VV-90TIN",
    categorySlug: "vintervarme-og-teletining",
    classLabel: "Storskala Teletiner • Tung",
    name: "90 kW Høykapasitet Teletiner & Betongherder (300 m²)",
    imageSrc: "/images/cat-vintervarme.webp",
    imageAlt: "90 kW tilhengermontert teletiner for store byggegroper og betongherding",
    powertrainLabel: "HVO100 / Fjernstyrt GSM",
    zeroEmission: false,
    capacityTier: "HEAVY",
    featured: false,
    dailyRateNok: 4200,
    weeklyRateNok: 17900,
    monthlyRateNok: 54500,
    specs: [
      { label: "Termisk effekt", value: "90 kW væskebåren" },
      { label: "Kapasitet", value: "Opptil 300 m² tining / 600 m² herding" },
      { label: "Overvåkning", value: "GSM temperatur- og driftsvarsel" },
      { label: "Strømtilkobling", value: "230V 16A sirkulasjonspumpe" }
    ],
    certificationBadge: "NS-EN 13670: Dokumentert herdetemperatur-logg + brannvern",
    prefilledOrderLine: "90 kW høykapasitet teletiner m/ GSM-overvåkning og isolasjonsmatter for såle/byggegrop."
  },
  {
    skuCode: "SKU-VV-36EL",
    categorySlug: "vintervarme-og-teletining",
    classLabel: "Byggvarme • Utslippsfri",
    name: "36 kW Elektrisk Varmluftsaggregat 400V (63A)",
    imageSrc: "/images/sku-byggtorker-36kw.webp",
    imageAlt: "36 kW elektrisk byggtørker og varmluftsaggregat med 400V CEE-tilkobling",
    powertrainLabel: "100 % Elektrisk 400V",
    zeroEmission: true,
    capacityTier: "MEDIUM",
    featured: false,
    dailyRateNok: 690,
    weeklyRateNok: 2650,
    monthlyRateNok: 7900,
    specs: [
      { label: "Varmeeffekt", value: "18 / 36 kW trinnstyrt" },
      { label: "Luftmengde", value: "3 400 m³/t" },
      { label: "Strømkrav", value: "400V 3-fas 63A CEE" },
      { label: "Utslipp inne", value: "0 % avgass / 0 % fukttilførsel" }
    ],
    certificationBadge: "Utslippsfri byggeplass: Godkjent for lukket råbygg og innredning",
    prefilledOrderLine: "36 kW elektrisk varmluftsaggregat (400V 63A) m/ romtermostat og varmluftslange."
  },
  {
    skuCode: "SKU-VV-MAT10",
    categorySlug: "vintervarme-og-teletining",
    classLabel: "Elektriske Tinematter",
    name: "Pakke 10 stk. Elektriske Teletinematter (30 m² • 230V)",
    imageSrc: "/images/sku-byggtorker-36kw.webp",
    imageAlt: "Elektriske teletinematter for lokal opptining av stikkledning og fundament",
    powertrainLabel: "100 % Elektrisk 230V",
    zeroEmission: true,
    capacityTier: "COMPACT",
    featured: false,
    dailyRateNok: 980,
    weeklyRateNok: 3800,
    monthlyRateNok: 10900,
    specs: [
      { label: "Dekningsareal", value: "30 m² (10 x 3,0 m²)" },
      { label: "Effekt pr. matte", value: "1 050 W (350 W/m²)" },
      { label: "Jordfeilvern", value: "30 mA personvernbrudd" },
      { label: "Bruksområde", value: "VA-stikk, kabelgrøft, punktfundament" }
    ],
    certificationBadge: "NEK 400: Krever 30 mA jordfeilbryter pr. kurs på byggestrømskap",
    prefilledOrderLine: "Pakke 10 stk. elektriske teletinematter (30 m²) for stillegående tining i boligstrøk."
  },

  // 4. BYGGESTROM OG UTSLIPPSFRI RIGG (4 SKUs)
  {
    skuCode: "SKU-RG-BESS90",
    categorySlug: "byggestrom-og-utslippsfri-rigg",
    classLabel: "Batteribank • Peak-Shaving",
    name: "90 kWh / 45 kVA Mobil Batteribank (BESS) 400V",
    imageSrc: "/images/cat-byggestrom-rigg.webp",
    imageAlt: "Mobil 90 kWh batteribank og 63A byggestrømskap på utslippsfri byggeplass",
    powertrainLabel: "100 % Elektrisk BESS",
    zeroEmission: true,
    capacityTier: "HEAVY",
    featured: true,
    dailyRateNok: 3250,
    weeklyRateNok: 13900,
    monthlyRateNok: 42500,
    specs: [
      { label: "Lagringskapasitet", value: "90 kWh LiFePO4" },
      { label: "Spisseffekt ut", value: "45 kVA (400V / 230V)" },
      { label: "Nettinntak inn", value: "16A–32A peak-shaving" },
      { label: "Støynivå", value: "0 dBA nattlading" }
    ],
    certificationBadge: "NEK 400-7-704: Ferdig sertifisert for hurtiglading av el-maskiner",
    prefilledOrderLine: "90 kWh / 45 kVA mobil batteribank (BESS) for peak-shaving og utslippsfri maskinlading."
  },
  {
    skuCode: "SKU-RG-SKAP63",
    categorySlug: "byggestrom-og-utslippsfri-rigg",
    classLabel: "Byggestrømskap • Fordeling",
    name: "63A Hoved-/Undersentral 400V/230V m/ målerramme",
    imageSrc: "/images/cat-byggestrom-rigg.webp",
    imageAlt: "63A godkjent byggestrømskap på varmgalvanisert stativ",
    powertrainLabel: "400V / 230V Nettdrift",
    zeroEmission: true,
    capacityTier: "COMPACT",
    featured: false,
    dailyRateNok: 320,
    weeklyRateNok: 1250,
    monthlyRateNok: 3600,
    specs: [
      { label: "Merkestrøm", value: "63A (opptil 43 kW ved 400V)" },
      { label: "Uttak", value: "1x63A, 2x32A, 4x16A CEE + Schuko" },
      { label: "Kapsling", value: "IP44 • galvanisert stativ" },
      { label: "Vern", value: "Type B/A jordfeilautomater" }
    ],
    certificationBadge: "NEK 400-7-704: Innmelding til lokalt nettselskap via aut. installatør",
    prefilledOrderLine: "63A byggestrømskap (400V/230V) m/ 25 m tilførselskabel og målerramme."
  },
  {
    skuCode: "SKU-RG-VOGN6P",
    categorySlug: "byggestrom-og-utslippsfri-rigg",
    classLabel: "Mannskapsvogn • Arbeidsplassforskriften",
    name: "6-manns Hjulgående Mannskaps- og Skiftevogn m/ WC",
    imageSrc: "/images/sku-mannskapsvogn.webp",
    imageAlt: "Isolert 6-manns mannskapsvogn med spiserom, tørkeskap og toalett",
    powertrainLabel: "230V Lavenergi",
    zeroEmission: true,
    capacityTier: "MEDIUM",
    featured: false,
    dailyRateNok: 890,
    weeklyRateNok: 3600,
    monthlyRateNok: 10800,
    specs: [
      { label: "Kapasitet", value: "6 personer (spise + skifte)" },
      { label: "Sanitær", value: "Kverntoalett / tank + varmtvann" },
      { label: "Vinterisolert", value: "Nordisk helårsstandard + tørk" },
      { label: "Tilkomst", value: "80 km/t registrert boggihenger" }
    ],
    certificationBadge: "Arbeidsplassforskriften kap. 3: Spiserom, tørkemulighet og WC på rigg",
    prefilledOrderLine: "6-manns vinterisolert mannskapsvogn m/ spiserom, tørkeskap og toalett."
  },
  {
    skuCode: "SKU-RG-AGG60",
    categorySlug: "byggestrom-og-utslippsfri-rigg",
    classLabel: "Strømaggregat • Stage V",
    name: "60 kVA Lyddempet Strømaggregat Stage V (HVO100)",
    imageSrc: "/images/cat-byggestrom-rigg.webp",
    imageAlt: "Lyddempet 60 kVA Stage V strømaggregat for anleggsplass uten fastnett",
    powertrainLabel: "Stage V / HVO100",
    zeroEmission: false,
    capacityTier: "HEAVY",
    featured: false,
    dailyRateNok: 1950,
    weeklyRateNok: 7900,
    monthlyRateNok: 23800,
    specs: [
      { label: "Kontinuerlig ytelse", value: "60 kVA / 48 kW (400V)" },
      { label: "Lydtrykk (7 m)", value: "63 dBA super-lyddempet" },
      { label: "Miljøklasse", value: "EU Stage V • klar for HVO100" },
      { label: "Autostart", value: "Kompatibel med BESS hybridrigg" }
    ],
    certificationBadge: "ADR / Miljøkrav: Dobbeltbunnet oppsamlingstank + Stage V-sertifikat",
    prefilledOrderLine: "60 kVA lyddempet Stage V strømaggregat klargjort for HVO100 levert til anleggsplass."
  },

  // 5. CONTAINER, KRANBIL OG MASSE (4 SKUs)
  {
    skuCode: "SKU-CM-10LIFT",
    categorySlug: "container-kranbil-og-masse",
    classLabel: "Liftcontainer • Tunge masser",
    name: "10 m³ Forsterket Liftcontainer for Betong, Tegl & Stein",
    imageSrc: "/images/cat-container-masse.webp",
    imageAlt: "10 kubikkmeter forsterket stålcontainer for tunge masser og betong",
    powertrainLabel: "Euro 6 / Biogass Liftbil",
    zeroEmission: false,
    capacityTier: "COMPACT",
    featured: false,
    dailyRateNok: 190,
    weeklyRateNok: 3900,
    monthlyRateNok: 8900,
    specs: [
      { label: "Volum", value: "10 m³ åpen eller lukket" },
      { label: "Maks nyttelast", value: "Opptil 12 tonn rene masser" },
      { label: "Utsett / henting", value: "Fastpris transport tur/retur" },
      { label: "Sortering", value: "Veieseddel til TEK17 sluttrapport" }
    ],
    certificationBadge: "TEK17 § 9-6: Sporbar veierapport for ≥ 70 % kildesorteringsgrad",
    prefilledOrderLine: "10 m³ forsterket liftcontainer for betong/tegl/stein inkl. utsett, tømming og veierapport."
  },
  {
    skuCode: "SKU-CM-30KROK",
    categorySlug: "container-kranbil-og-masse",
    classLabel: "Krokcontainer • Råbygg/Rehab",
    name: "30 m³ Krokcontainer m/ bakdører (Trevirke / Gips / Isolasjon)",
    imageSrc: "/images/cat-container-masse.webp",
    imageAlt: "30 kubikkmeter krokcontainer med bakdører på norsk rehabiliteringsprosjekt",
    powertrainLabel: "El-krokbil / Biogass",
    zeroEmission: true,
    capacityTier: "MEDIUM",
    featured: true,
    dailyRateNok: 240,
    weeklyRateNok: 4600,
    monthlyRateNok: 10400,
    specs: [
      { label: "Volum", value: "30 m³ med lave innlastingsdører" },
      { label: "Fraksjonsvalg", value: "Rent trevirke, gips eller rest" },
      { label: "Transport", value: "El-/biogass krokbil i bysoner" },
      { label: "Dokumentasjon", value: "Digital fraksjons- og vektlogg" }
    ],
    certificationBadge: "TEK17 § 9-6 + Nullutslippssone: Leveres med elektrisk eller biogass krokbil",
    prefilledOrderLine: "30 m³ krokcontainer m/ bakdører levert med nullutslipp/biogass krokbil til råbygg."
  },
  {
    skuCode: "SKU-CM-PUKK15",
    categorySlug: "container-kranbil-og-masse",
    classLabel: "Masselevering • Tippbil",
    name: "Boggilass 14 tonn Pukk 8/16 eller Bærelag 0/32 (Tipp/Spredning)",
    imageSrc: "/images/cat-container-masse.webp",
    imageAlt: "Levering av pukk og bærelag med tippbil på anleggsplass",
    powertrainLabel: "Euro 6 / HVO100 Tippbil",
    zeroEmission: false,
    capacityTier: "MEDIUM",
    featured: false,
    dailyRateNok: 4800,
    weeklyRateNok: 14200,
    monthlyRateNok: 42000,
    specs: [
      { label: "Levert mengde", value: "ca. 13–15 tonn pr. boggilass" },
      { label: "Fraksjon", value: "CE-merket 8/16, 0/32 eller 20/120" },
      { label: "Leveringsmåte", value: "Tipping eller spredning i grøft" },
      { label: "Retur", value: "Mulighet for utlast av overskuddsmasse" }
    ],
    certificationBadge: "CE-merkede tilslag (NS-EN 13242) med ytelseserklæring fra lokalt pukkverk",
    prefilledOrderLine: "Levering av boggilass (ca. 14 tonn) CE-merket pukk 8/16 / bærelag 0/32 til byggeplass."
  },
  {
    skuCode: "SKU-CM-KRAN65",
    categorySlug: "container-kranbil-og-masse",
    classLabel: "Kranbil • Tung montasje",
    name: "65 tm Kranbil m/ jibb, vinsj & sertifisert G8-fører (Dagsramme)",
    imageSrc: "/images/cat-container-masse.webp",
    imageAlt: "65 tonnmeter kranbil med jibb for løft av takstoler og moduler",
    powertrainLabel: "Elektrisk kraftuttak (e-PTO)",
    zeroEmission: true,
    capacityTier: "HEAVY",
    featured: false,
    dailyRateNok: 11800,
    weeklyRateNok: 49500,
    monthlyRateNok: 148000,
    specs: [
      { label: "Krankapasitet", value: "65 tonnmeter m/ hydraulisk jibb" },
      { label: "Maks rekkevidde", value: "Opptil 31 m med jibb" },
      { label: "Krandrift på plass", value: "Utslippsfri e-PTO via 400V/batteri" },
      { label: "Bemanning", value: "Inkl. G8-sertifisert kranfører" }
    ],
    certificationBadge: "Kompetansekrav: G8 lastebilkran + G11 anhuker/signalmann + støttebeinskontroll",
    prefilledOrderLine: "65 tm kranbil m/ jibb, vinsj og utslippsfri e-PTO til montasjeløft av takstoler/moduler."
  }
] as const;

export const EQUIPMENT_SKUS: readonly EquipmentSku[] = BASE_EQUIPMENT_SKUS.filter((sku) => {
  const cms = getStaticCmsConfig();
  return cms.skuRateOverrides[sku.skuCode]?.hidden !== true;
}).map((sku) => {
  const cms = getStaticCmsConfig();
  const ov = cms.skuRateOverrides[sku.skuCode];
  if (!ov) return sku;
  return {
    ...sku,
    dailyRateNok: ov.dailyRateNok ?? sku.dailyRateNok,
    weeklyRateNok: ov.weeklyRateNok ?? sku.weeklyRateNok,
    monthlyRateNok: ov.monthlyRateNok ?? sku.monthlyRateNok,
    featured: ov.featured ?? sku.featured
  };
});

export function getSkusByCategory(categorySlug: CategorySlug): readonly EquipmentSku[] {
  return EQUIPMENT_SKUS.filter((sku) => sku.categorySlug === categorySlug);
}

export function getFeaturedSkus(): readonly EquipmentSku[] {
  return EQUIPMENT_SKUS.filter((sku) => sku.featured);
}

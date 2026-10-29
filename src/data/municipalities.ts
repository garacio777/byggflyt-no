import type { MunicipalitySlug } from "../schemas/directory.js";
import { getStaticCmsConfig } from "./cms-loader.js";

export interface MunicipalityProfile {
  readonly slug: MunicipalitySlug;
  readonly name: string;
  readonly shortName: string;
  readonly county: string;
  readonly keyHubs: readonly string[];
  readonly samplePostalCode: string;
  readonly postalRange: string;
  readonly frostDepthCm: number;
  readonly designWinterTempC: number;
  readonly emissionPolicyLevel: "STRENG_UTSLIPPSFRI" | "KLIMAVEKTET_30_PROSENT" | "STAGE_V_OG_HVO100";
  readonly emissionPolicySummary: string;
  readonly groundConditionProfile: string;
  readonly logisticsCorridors: string;
  readonly flatbedTransferNokRange: string;
  readonly baseMonthlyTerritoryNok: number;
}

export const BASE_MUNICIPALITIES: readonly MunicipalityProfile[] = [
  {
    slug: "oslo",
    name: "Oslo",
    shortName: "Oslo",
    county: "Oslo",
    keyHubs: ["Sentrum", "Økern & Hovinbyen", "Nydalen", "Alnabru", "Bjørvika"],
    samplePostalCode: "0580",
    postalRange: "0010–1295",
    frostDepthCm: 145,
    designWinterTempC: -16,
    emissionPolicyLevel: "STRENG_UTSLIPPSFRI",
    emissionPolicySummary:
      "Skjerpede krav til utslippsfrie maskiner, elektrisk oppvarming/fjernvarme og batteribank (BESS) ved offentlige prosjekter og trange bygårder.",
    groundConditionProfile:
      "Bymessig fyllmasse, leire i lavereliggende soner og bærende gårdsromsdekker over kjeller/garasje (kritisk marktrykk-kontroll for lift og kran).",
    logisticsCorridors: "Ring 3, E6 Alnabru, E18 Mosseveien/Drammensveien, Rv. 4",
    flatbedTransferNokRange: "2 900 – 4 800 kr/vei",
    baseMonthlyTerritoryNok: 14500
  },
  {
    slug: "baerum-asker",
    name: "Bærum og Asker",
    shortName: "Bærum & Asker",
    county: "Akershus",
    keyHubs: ["Fornebu", "Sandvika", "Lysaker", "Billingstad", "Asker sentrum"],
    samplePostalCode: "1360",
    postalRange: "1300–1397",
    frostDepthCm: 150,
    designWinterTempC: -16,
    emissionPolicyLevel: "STRENG_UTSLIPPSFRI",
    emissionPolicySummary:
      "Høy andel utslippsfrie kommunale byggeplasser på Fornebu og i Sandvika, samt strenge støy- og støvkrav i tettbebygde boligstrøk.",
    groundConditionProfile:
      "Kalksteins- og skiferberg kombinert med marin leire nær sjøen og bratte boligtomter som krever kompaktmaskiner eller beltegående edderkopplift.",
    logisticsCorridors: "E18 Lysaker–Asker, E16 Sandvika–Sollihøgda",
    flatbedTransferNokRange: "3 200 – 5 200 kr/vei",
    baseMonthlyTerritoryNok: 11900
  },
  {
    slug: "nordre-follo-aas",
    name: "Ås og Nordre Follo",
    shortName: "Ås & Ski (Follo)",
    county: "Akershus",
    keyHubs: ["Ski", "Ås", "Vinterbro", "Langhus", "Kolbotn"],
    samplePostalCode: "1430",
    postalRange: "1400–1435",
    frostDepthCm: 155,
    designWinterTempC: -17,
    emissionPolicyLevel: "KLIMAVEKTET_30_PROSENT",
    emissionPolicySummary:
      "Minimum 30 % klima- og miljøvekting i offentlige anbud rundt Ski, Campus Ås og kollektivknutepunkter; sterk etterspørsel etter el-graver og HVO100.",
    groundConditionProfile:
      "Utpreget marin bløtleire og kvikkleiresoner på dyrket mark og utbyggingsfelt — krever brede belter, lavt marktrykk og riktig masseutskifting.",
    logisticsCorridors: "E6 Vinterbro–Ås, E18 Mosseveien–Retvet, Fv. 152",
    flatbedTransferNokRange: "2 600 – 4 400 kr/vei",
    baseMonthlyTerritoryNok: 9800
  },
  {
    slug: "lillestrom-lorenskog",
    name: "Lillestrøm og Lørenskog",
    shortName: "Nedre Romerike",
    county: "Akershus",
    keyHubs: ["Lillestrøm", "Lørenskog", "Strømmen", "Skedsmokorset", "Fetsund"],
    samplePostalCode: "2000",
    postalRange: "1470–2022",
    frostDepthCm: 165,
    designWinterTempC: -19,
    emissionPolicyLevel: "KLIMAVEKTET_30_PROSENT",
    emissionPolicySummary:
      "Store knutepunkt- og boligprosjekter med strenge krav til elektrisk byggvarme, støysvak drift og dokumentert 70 % avfallssortering (TEK17).",
    groundConditionProfile:
      "Dyp Romeriksleire og flomutsatte elvesletter langs Nitelva/Øyeren — krever nøye komprimeringskontroll, spunt/grøftesikring og belteutstyr.",
    logisticsCorridors: "E6 Berger–Karihaugen, Rv. 159, Rv. 22",
    flatbedTransferNokRange: "2 700 – 4 500 kr/vei",
    baseMonthlyTerritoryNok: 11500
  },
  {
    slug: "ullensaker-gardermoen",
    name: "Ullensaker og Gardermoen",
    shortName: "Jessheim & Gardermoen",
    county: "Akershus",
    keyHubs: ["Jessheim", "Gardermoen Næringspark", "Kløfta", "Råholt", "Eidsvoll"],
    samplePostalCode: "2050",
    postalRange: "2030–2080",
    frostDepthCm: 180,
    designWinterTempC: -22,
    emissionPolicyLevel: "KLIMAVEKTET_30_PROSENT",
    emissionPolicySummary:
      "Store logistikk- og lagerbygg rundt Gardermoen med høye krav til innendørs utslippsfri saks-/bomlift og effektiv vinterdrift.",
    groundConditionProfile:
      "Sand- og grusavsetninger på Gardermo-sletta kombinert med lange kuldeperioder som gir dyp tele og stort behov for teletining oktober–april.",
    logisticsCorridors: "E6 Kløfta–Dal, E16 Gardermoen",
    flatbedTransferNokRange: "2 900 – 4 900 kr/vei",
    baseMonthlyTerritoryNok: 9900
  },
  {
    slug: "moss-vestby",
    name: "Moss og Vestby",
    shortName: "Moss & Vestby",
    county: "Østfold / Akershus",
    keyHubs: ["Vestby Næringspark", "Moss", "Hølen", "Son", "Rygge"],
    samplePostalCode: "1540",
    postalRange: "1501–1580",
    frostDepthCm: 145,
    designWinterTempC: -15,
    emissionPolicyLevel: "KLIMAVEKTET_30_PROSENT",
    emissionPolicySummary:
      "Tunge industri- og logistikkprosjekter langs E6 (Vestby/Rygge) samt byutvikling i Moss med krav til dokumentert miljøregnskap.",
    groundConditionProfile:
      "Store betonggulv for høytlager i Vestby (perfekt for tunge elektriske sakslifter) og krevende kvikkleire/bygrunn i Moss sentrum.",
    logisticsCorridors: "E6 Vestby–Rygge, Rv. 19 Moss–Horten (fergeforbindelse)",
    flatbedTransferNokRange: "2 600 – 4 300 kr/vei",
    baseMonthlyTerritoryNok: 9200
  },
  {
    slug: "indre-ostfold",
    name: "Indre Østfold",
    shortName: "Spydeberg, Askim & Mysen",
    county: "Østfold",
    keyHubs: ["Spydeberg", "Askim", "Mysen", "Tomter", "Skjønhaug"],
    samplePostalCode: "1820",
    postalRange: "1800–1892",
    frostDepthCm: 165,
    designWinterTempC: -19,
    emissionPolicyLevel: "STAGE_V_OG_HVO100",
    emissionPolicySummary:
      "Sterkt maskin- og entreprenørknutepunkt langs E18 med rask tilgang på både Stage V anleggsmaskiner, HVO100-løsninger og elektriske alternativer.",
    groundConditionProfile:
      "Veksling mellom jordbruksleire, moreinerygger og fjellskjæringer — høy aktivitet innen VA-grøfter, næringsbygg og landbruks-/industririgg.",
    logisticsCorridors: "E18 Knapstad–Ørje, Rv. 22, Fv. 128",
    flatbedTransferNokRange: "2 200 – 3 900 kr/vei",
    baseMonthlyTerritoryNok: 7900
  },
  {
    slug: "sarpsborg",
    name: "Sarpsborg og Rakkestad",
    shortName: "Sarpsborg",
    county: "Østfold",
    keyHubs: ["Sarpsborg", "Grålum", "Borgenhaugen", "Hafslund", "Rakkestad"],
    samplePostalCode: "1712",
    postalRange: "1701–1890",
    frostDepthCm: 150,
    designWinterTempC: -16,
    emissionPolicyLevel: "STAGE_V_OG_HVO100",
    emissionPolicySummary:
      "Industri-, prosess- og samferdselsprosjekter rundt Grålum/Øra-aksen med strenge HMS-krav til sertifisert personløfter, stillas og varmearbeid.",
    groundConditionProfile:
      "Raet morenerygg gjennom Sarpsborg gir gode masser sentralt, mens omkringliggende flater har bløtleire langs Glomma.",
    logisticsCorridors: "E6 Grålum–Solli, Rv. 22 Sarpsborg–Rakkestad, Rv. 111",
    flatbedTransferNokRange: "2 300 – 4 000 kr/vei",
    baseMonthlyTerritoryNok: 8500
  },
  {
    slug: "fredrikstad",
    name: "Fredrikstad og Halden",
    shortName: "Fredrikstad & Halden",
    county: "Østfold",
    keyHubs: ["Fredrikstad", "Øra Industriområde", "Rolvsøy", "Kråkerøy", "Halden"],
    samplePostalCode: "1607",
    postalRange: "1601–1792",
    frostDepthCm: 140,
    designWinterTempC: -15,
    emissionPolicyLevel: "KLIMAVEKTET_30_PROSENT",
    emissionPolicySummary:
      "Sirkulærindustri på Øra, havne-/byrehabilitering og kommunale anbud med 30 % klimavekting og skjerpede krav til avfallssortering.",
    groundConditionProfile:
      "Elvedelta og dyp leire ved Glomma-utløpet kombinert med kystvind som krever vindberegnet fasadestillas og riktig dimensjonert bomlift.",
    logisticsCorridors: "E6 Svinesund–Sollikrysset, Rv. 110, Rv. 22",
    flatbedTransferNokRange: "2 500 – 4 400 kr/vei",
    baseMonthlyTerritoryNok: 8900
  },
  {
    slug: "drammen-lier",
    name: "Drammen og Lier",
    shortName: "Drammen & Lier",
    county: "Buskerud",
    keyHubs: ["Brakerøya", "Strømsø", "Lierstranda", "Mjøndalen", "Konnerud"],
    samplePostalCode: "3012",
    postalRange: "3001–3420",
    frostDepthCm: 155,
    designWinterTempC: -18,
    emissionPolicyLevel: "KLIMAVEKTET_30_PROSENT",
    emissionPolicySummary:
      "Store sykehus-, havne- og byutviklingsprosjekter på Brakerøya/Lierstranda med høye krav til nullutslippsrigg, fjernvarme/byggvarme og støykontroll.",
    groundConditionProfile:
      "Krevende elveavsetninger og setningsutsatt grunn i dalbunnen mot bratte fjellskråninger på Åssiden og Konnerud.",
    logisticsCorridors: "E18 Lier–Drammen, E134 Drammen–Mjøndalen, Rv. 23",
    flatbedTransferNokRange: "2 800 – 4 700 kr/vei",
    baseMonthlyTerritoryNok: 10400
  }
] as const;

export const MUNICIPALITIES: readonly MunicipalityProfile[] = BASE_MUNICIPALITIES.map((mun) => {
  const cms = getStaticCmsConfig();
  const ov = cms.municipalityOverrides[mun.slug];
  if (!ov) return mun;
  return {
    ...mun,
    frostDepthCm: ov.frostDepthCm ?? mun.frostDepthCm,
    designWinterTempC: ov.designWinterTempC ?? mun.designWinterTempC,
    flatbedTransferNokRange: ov.flatbedTransferNokRange ?? mun.flatbedTransferNokRange,
    baseMonthlyTerritoryNok: ov.baseMonthlyTerritoryNok ?? mun.baseMonthlyTerritoryNok,
    emissionPolicySummary: ov.emissionPolicySummary ?? mun.emissionPolicySummary,
    groundConditionProfile: ov.groundConditionProfile ?? mun.groundConditionProfile
  };
});

export function getMunicipalityBySlug(slug: MunicipalitySlug): MunicipalityProfile {
  const match = MUNICIPALITIES.find((item) => item.slug === slug);
  if (!match) {
    throw new Error(`Unknown municipality slug: ${slug}`);
  }
  return match;
}

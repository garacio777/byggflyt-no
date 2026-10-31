import {
  CategorySlugEnum,
  MunicipalitySlugEnum,
  PartnerInquiryConfirmationSchema,
  VerifiedOrgResponseSchema,
  validateNorwegianOrgNr
} from "../schemas/directory.js";

function extractFirstValidationError(rawJson: unknown): string | null {
  if (typeof rawJson !== "object" || rawJson === null) {
    return null;
  }
  if ("details" in rawJson && typeof rawJson.details === "object" && rawJson.details !== null) {
    const details = rawJson.details;
    if ("fieldErrors" in details && typeof details.fieldErrors === "object" && details.fieldErrors !== null) {
      for (const value of Object.values(details.fieldErrors)) {
        if (Array.isArray(value) && typeof value[0] === "string" && value[0].length > 0) {
          return value[0];
        }
      }
    }
  }
  if ("error" in rawJson && typeof rawJson.error === "string" && rawJson.error.length > 0) {
    return rawJson.error;
  }
  return null;
}

function initPartnerPage(): void {
  const form = document.querySelector<HTMLFormElement>("[data-partner-form]");
  if (!form) return;

  const orgInput = form.querySelector<HTMLInputElement>("[data-partner-orgnr]");
  const companyInput = form.querySelector<HTMLInputElement>("[data-partner-company]");
  const contactInput = form.querySelector<HTMLInputElement>("[data-partner-contact]");
  const emailInput = form.querySelector<HTMLInputElement>("[data-partner-email]");
  const phoneInput = form.querySelector<HTMLInputElement>("[data-partner-phone]");
  const munSelect = form.querySelector<HTMLSelectElement>("[data-partner-mun]");
  const catSelect = form.querySelector<HTMLSelectElement>("[data-partner-cat]");
  const depotInput = form.querySelector<HTMLInputElement>("[data-partner-depot]");
  const fleetInput = form.querySelector<HTMLTextAreaElement>("[data-partner-fleet]");
  const verifyBtn = form.querySelector<HTMLButtonElement>("[data-partner-verify-btn]");
  const feedbackBox = form.querySelector<HTMLElement>("[data-partner-feedback]");
  const submitBtn = form.querySelector<HTMLButtonElement>("[data-partner-submit]");

  // Prefill territory selection when arriving from a local or category page (?kommune=...&kategori=...)
  const searchParams = new URLSearchParams(window.location.search);
  const rawMunParam = searchParams.get("kommune");
  const rawCatParam = searchParams.get("kategori");
  let preselectedFromUrl = false;

  if (rawMunParam && munSelect) {
    const parsedMun = MunicipalitySlugEnum.safeParse(rawMunParam);
    if (parsedMun.success) {
      munSelect.value = parsedMun.data;
      preselectedFromUrl = true;
    }
  }
  if (rawCatParam && catSelect) {
    const parsedCat = CategorySlugEnum.safeParse(rawCatParam);
    if (parsedCat.success) {
      catSelect.value = parsedCat.data;
      preselectedFromUrl = true;
    }
  }
  if (preselectedFromUrl && feedbackBox) {
    const munLabel = munSelect?.selectedOptions[0]?.textContent?.trim() ?? "";
    const catLabel = catSelect?.selectedOptions[0]?.textContent?.trim() ?? "";
    feedbackBox.hidden = false;
    feedbackBox.className = "status-banner status-ok";
    feedbackBox.textContent = `Valgt sone klar for 48t reservasjon: ${catLabel} i ${munLabel}. Oppgi org.nr (9 siffer) for automatisk Brreg-utfylling.`;
  }

  const slotButtons = document.querySelectorAll<HTMLButtonElement>("[data-select-slot]");
  for (const btn of slotButtons) {
    btn.addEventListener("click", () => {
      const mun = btn.getAttribute("data-slot-mun");
      const cat = btn.getAttribute("data-slot-cat");
      if (mun && munSelect) {
        const parsedMun = MunicipalitySlugEnum.safeParse(mun);
        if (parsedMun.success) munSelect.value = parsedMun.data;
      }
      if (cat && catSelect) {
        const parsedCat = CategorySlugEnum.safeParse(cat);
        if (parsedCat.success) catSelect.value = parsedCat.data;
      }
      if (feedbackBox) {
        const munLabel = munSelect?.selectedOptions[0]?.textContent?.trim() ?? "";
        const catLabel = catSelect?.selectedOptions[0]?.textContent?.trim() ?? "";
        feedbackBox.hidden = false;
        feedbackBox.className = "status-banner status-ok";
        feedbackBox.textContent = `Valgt sone: ${catLabel} i ${munLabel}. Fyll inn org.nr og kontaktdata under for å låse 48t reservasjon.`;
      }
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      orgInput?.focus();
    });
  }

  let lastLookedUpOrgNr = "";

  async function lookupPartnerOrg(cleaned: string): Promise<void> {
    if (!feedbackBox) return;
    lastLookedUpOrgNr = cleaned;
    feedbackBox.hidden = false;
    feedbackBox.className = "status-banner status-warn";
    feedbackBox.textContent = "Slår opp foretak i Enhetsregisteret…";

    try {
      const res = await fetch(`/api/verify-org?orgnr=${encodeURIComponent(cleaned)}`);
      const rawJson: unknown = await res.json();
      if (!res.ok) {
        feedbackBox.className = "status-banner status-err";
        feedbackBox.textContent =
          extractFirstValidationError(rawJson) ??
          "Oppgi gyldig 9-sifret norsk organisasjonsnummer.";
        return;
      }
      const parsed = VerifiedOrgResponseSchema.safeParse(rawJson);
      if (parsed.success) {
        if (companyInput) companyInput.value = parsed.data.companyName;
        if (depotInput && !depotInput.value.trim() && parsed.data.municipalityName) {
          depotInput.value = parsed.data.municipalityName;
        }
        feedbackBox.className = "status-banner status-ok";
        feedbackBox.textContent = `Verifisert: ${parsed.data.companyName} (${parsed.data.orgFormCode}) — ${parsed.data.naceDescription}`;
      }
    } catch {
      feedbackBox.className = "status-banner status-err";
      feedbackBox.textContent = "Feil ved oppslag mot Enhetsregisteret.";
    }
  }

  if (verifyBtn && orgInput) {
    verifyBtn.addEventListener("click", () => {
      const cleaned = orgInput.value.replace(/\s+/g, "");
      void lookupPartnerOrg(cleaned);
    });

    orgInput.addEventListener("input", () => {
      const cleaned = orgInput.value.replace(/\s+/g, "");
      if (cleaned.length === 9 && cleaned !== lastLookedUpOrgNr && validateNorwegianOrgNr(cleaned)) {
        void lookupPartnerOrg(cleaned);
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!feedbackBox || !submitBtn) return;

    submitBtn.disabled = true;
    feedbackBox.hidden = false;
    feedbackBox.className = "status-banner status-warn";
    feedbackBox.textContent = "Registrerer reservasjon av eksklusivt territorium…";

    const payload = {
      orgNr: orgInput?.value ?? "",
      companyName: companyInput?.value ?? "",
      contactName: contactInput?.value ?? "",
      email: emailInput?.value ?? "",
      phone: phoneInput?.value ?? "",
      desiredMunicipality: munSelect?.value ?? "nordre-follo-aas",
      desiredCategory: catSelect?.value ?? "maskinutleie",
      depotLocation: depotInput?.value ?? "",
      fleetSummary: fleetInput?.value ?? ""
    };

    try {
      const res = await fetch("/api/partner-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const rawJson: unknown = await res.json();

      if (!res.ok) {
        feedbackBox.className = "status-banner status-err";
        feedbackBox.textContent =
          extractFirstValidationError(rawJson) ??
          "Kontroller at org.nr (9 siffer), e-post, mobil, depotsted og maskinparkbeskrivelse (minst 10 tegn) er utfylt.";
        submitBtn.disabled = false;
        return;
      }

      const parsed = PartnerInquiryConfirmationSchema.safeParse(rawJson);
      if (!parsed.success) {
        feedbackBox.className = "status-banner status-err";
        feedbackBox.textContent = "Uventet svar fra server.";
        submitBtn.disabled = false;
        return;
      }

      const conf = parsed.data;
      feedbackBox.className = "status-banner status-ok";
      feedbackBox.replaceChildren();

      const heading = document.createElement("strong");
      heading.textContent = `Reservasjon registrert (${conf.applicationId}) — ${conf.nextStepMessage}`;

      const detail = document.createElement("p");
      detail.className = "card-text";
      detail.textContent = `Veiledende månedsleie for enerett i sonen: ${conf.suggestedMonthlyRetainerNok.toLocaleString(
        "nb-NO"
      )} kr/mnd eks. mva (estimert ${conf.estimatedMonthlyLeadsMin}–${conf.estimatedMonthlyLeadsMax} kvalifiserte B2B-forespørsler/mnd). Vi kontakter dere direkte på oppgitt e-post/telefon innen kort tid.`;

      feedbackBox.append(heading, detail);
      form.reset();
      lastLookedUpOrgNr = "";
    } catch {
      feedbackBox.className = "status-banner status-err";
      feedbackBox.textContent = "Nettverksfeil ved innsending.";
    } finally {
      submitBtn.disabled = false;
    }
  });
}

initPartnerPage();

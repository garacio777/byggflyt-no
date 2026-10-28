import {
  PartnerInquiryConfirmationSchema,
  VerifiedOrgResponseSchema
} from "../schemas/directory.js";

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

  const slotButtons = document.querySelectorAll<HTMLButtonElement>("[data-select-slot]");
  for (const btn of slotButtons) {
    btn.addEventListener("click", () => {
      const mun = btn.getAttribute("data-slot-mun");
      const cat = btn.getAttribute("data-slot-cat");
      if (mun && munSelect) munSelect.value = mun;
      if (cat && catSelect) catSelect.value = cat;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (verifyBtn && orgInput && feedbackBox) {
    verifyBtn.addEventListener("click", async () => {
      const cleaned = orgInput.value.replace(/\s+/g, "");
      feedbackBox.hidden = false;
      feedbackBox.className = "status-banner status-warn";
      feedbackBox.textContent = "Slår opp foretak i Enhetsregisteret…";

      try {
        const res = await fetch(`/api/verify-org?orgnr=${encodeURIComponent(cleaned)}`);
        const rawJson: unknown = await res.json();
        if (!res.ok) {
          feedbackBox.className = "status-banner status-err";
          feedbackBox.textContent = "Oppgi gyldig 9-sifret norsk organisasjonsnummer.";
          return;
        }
        const parsed = VerifiedOrgResponseSchema.safeParse(rawJson);
        if (parsed.success) {
          if (companyInput) companyInput.value = parsed.data.companyName;
          feedbackBox.className = "status-banner status-ok";
          feedbackBox.textContent = `Verifisert: ${parsed.data.companyName} (${parsed.data.orgFormCode}) — ${parsed.data.naceDescription}`;
        }
      } catch {
        feedbackBox.className = "status-banner status-err";
        feedbackBox.textContent = "Feil ved oppslag.";
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
          "Kontroller at org.nr (9 siffer), e-post, mobil, depotsted og maskinparkbeskrivelse er utfylt.";
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
      feedbackBox.textContent = `${conf.applicationId}: ${conf.nextStepMessage} Veiledende månedsleie for eksklusivitet: ${conf.suggestedMonthlyRetainerNok.toLocaleString(
        "nb-NO"
      )} kr/mnd eks. mva (estimert ${conf.estimatedMonthlyLeadsMin}–${conf.estimatedMonthlyLeadsMax} kvalifiserte B2B-forespørsler/mnd).`;
    } catch {
      feedbackBox.className = "status-banner status-err";
      feedbackBox.textContent = "Nettverksfeil ved innsending.";
    } finally {
      submitBtn.disabled = false;
    }
  });
}

initPartnerPage();

import {
  calculateExcavatorSpec,
  calculateLiftSpec,
  calculateMassWasteSpec,
  calculateSitePowerSpec,
  calculateWinterHeatSpec,
  type UnifiedCalcOutput
} from "../lib/calculators.js";
import {
  CategorySlugEnum,
  LeadDispatchConfirmationSchema,
  SkuCodeSchema,
  VerifiedOrgResponseSchema,
  type CalculatorSnapshot,
  type CategorySlug
} from "../schemas/directory.js";

let latestCalcSnapshot: CalculatorSnapshot | undefined;
let latestPrefilledText = "";
let activeSelectedSkuCode: string | undefined;

function readNumberInput(root: ParentNode, selector: string, fallback: number): number {
  const el = root.querySelector<HTMLInputElement>(selector);
  if (!el) return fallback;
  const parsed = Number(el.value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function computeActiveWidget(widget: HTMLElement): UnifiedCalcOutput {
  const rawCat = widget.getAttribute("data-active-cat") ?? "maskinutleie";
  const parsedCat = CategorySlugEnum.safeParse(rawCat);
  const activeCat: CategorySlug = parsedCat.success ? parsedCat.data : "maskinutleie";

  switch (activeCat) {
    case "maskinutleie": {
      const zeroEl = widget.querySelector<HTMLInputElement>("[data-ex-zero]");
      return calculateExcavatorSpec({
        trenchDepthMeters: readNumberInput(widget, "[data-ex-depth]", 2.2),
        layerThicknessCm: readNumberInput(widget, "[data-ex-layer]", 30),
        gateWidthCm: readNumberInput(widget, "[data-ex-gate]", 240),
        zeroEmissionRequired: zeroEl?.checked === true,
        durationDays: readNumberInput(widget, "[data-ex-days]", 5)
      });
    }
    case "lift-og-stillas": {
      const surfSelect = widget.querySelector<HTMLSelectElement>("[data-lift-surface]");
      const rawSurface = surfSelect?.value ?? "ASFALT_BETONG";
      const surfaceType =
        rawSurface === "GARASJEDEKKE" ||
        rawSurface === "TERRENG_LEIRE" ||
        rawSurface === "INNENDORS_GULV"
          ? rawSurface
          : "ASFALT_BETONG";

      return calculateLiftSpec({
        workingHeightMeters: readNumberInput(widget, "[data-lift-height]", 16),
        horizontalOutreachMeters: readNumberInput(widget, "[data-lift-outreach]", 6),
        surfaceType,
        gateWidthCm: readNumberInput(widget, "[data-lift-gate]", 250),
        durationDays: readNumberInput(widget, "[data-lift-days]", 5)
      });
    }
    case "vintervarme-og-teletining": {
      const groundSelect = widget.querySelector<HTMLSelectElement>("[data-heat-ground]");
      const rawGround = groundSelect?.value ?? "VAAT_LEIRE";
      const groundType =
        rawGround === "MORENE_PUKK" || rawGround === "BETONGHERDING" ? rawGround : "VAAT_LEIRE";

      return calculateWinterHeatSpec({
        areaSqm: readNumberInput(widget, "[data-heat-area]", 120),
        frostDepthCm: readNumberInput(widget, "[data-heat-frost]", 155),
        ambientTempC: readNumberInput(widget, "[data-heat-temp]", -16),
        groundType,
        durationDays: readNumberInput(widget, "[data-heat-days]", 4)
      });
    }
    case "byggestrom-og-utslippsfri-rigg": {
      const fuseSelect = widget.querySelector<HTMLSelectElement>("[data-rig-fuse]");
      const fuseVal = Number(fuseSelect?.value ?? "63");
      const gridFuseAmps: 32 | 63 | 125 = fuseVal === 32 ? 32 : fuseVal === 125 ? 125 : 63;

      return calculateSitePowerSpec({
        crewCount: readNumberInput(widget, "[data-rig-crew]", 8),
        gridFuseAmps,
        electricMachinesCount: readNumberInput(widget, "[data-rig-el]", 1),
        heatingLoadKw: readNumberInput(widget, "[data-rig-heat]", 18),
        fenceMeters: readNumberInput(widget, "[data-rig-fence]", 110),
        durationDays: readNumberInput(widget, "[data-rig-days]", 30)
      });
    }
    case "container-kranbil-og-masse": {
      const matSelect = widget.querySelector<HTMLSelectElement>("[data-mass-type]");
      const rawMat = matSelect?.value ?? "PUKK_8_16";
      const materialType =
        rawMat === "BAERELAG_0_32" || rawMat === "KULT_20_120" || rawMat === "UTGRAVD_LEIRE"
          ? rawMat
          : "PUKK_8_16";

      return calculateMassWasteSpec({
        areaSqm: readNumberInput(widget, "[data-mass-area]", 140),
        thicknessCm: readNumberInput(widget, "[data-mass-thick]", 35),
        materialType,
        buildingBraSqm: readNumberInput(widget, "[data-mass-bra]", 380)
      });
    }
  }
}

function renderCalculatorOutput(widget: HTMLElement, output: UnifiedCalcOutput): void {
  const headlineEl = widget.querySelector<HTMLElement>("[data-calc-headline]");
  const metricsContainer = widget.querySelector<HTMLElement>("[data-calc-metrics]");
  const complianceEl = widget.querySelector<HTMLElement>("[data-calc-compliance]");

  if (headlineEl) {
    headlineEl.textContent = output.headlineSpec;
  }
  if (complianceEl) {
    complianceEl.textContent = output.complianceSummary;
  }
  if (metricsContainer) {
    metricsContainer.replaceChildren();
    for (const metric of output.keyMetrics) {
      const tile = document.createElement("div");
      tile.className = "metric-tile";

      const labelSpan = document.createElement("span");
      labelSpan.className = "metric-tile-label";
      labelSpan.textContent = metric.label;

      const valueSpan = document.createElement("span");
      valueSpan.className = "metric-tile-value";
      valueSpan.textContent = metric.value;

      tile.append(labelSpan, valueSpan);
      metricsContainer.appendChild(tile);
    }
  }

  latestCalcSnapshot = {
    calculatorType: output.calculatorType,
    headlineSpec: output.headlineSpec.slice(0, 220),
    estimatedValueNokMin: output.estimatedValueNokMin,
    estimatedValueNokMax: output.estimatedValueNokMax,
    complianceSummary: output.complianceSummary.slice(0, 260)
  };
  latestPrefilledText = output.prefilledOrderText;
}

function initSkuCatalogGrids(): void {
  const roots = document.querySelectorAll<HTMLElement>("[data-sku-grid-root]");
  for (const root of roots) {
    const filterButtons = root.querySelectorAll<HTMLElement>("[data-sku-filter]");
    const cards = root.querySelectorAll<HTMLElement>("[data-sku-card]");
    const emptyBox = root.querySelector<HTMLElement>("[data-sku-empty]");

    for (const filterBtn of filterButtons) {
      filterBtn.addEventListener("click", () => {
        const filterMode = filterBtn.getAttribute("data-sku-filter") ?? "ALL";

        for (const btn of filterButtons) {
          btn.setAttribute("aria-pressed", btn === filterBtn ? "true" : "false");
        }

        let visibleCount = 0;
        for (const card of cards) {
          let matches = true;
          if (filterMode === "ZERO_EMISSION") {
            matches = card.getAttribute("data-zero-emission") === "true";
          } else if (filterMode === "TUNG") {
            matches = card.getAttribute("data-sku-tier") === "HEAVY";
          }
          card.hidden = !matches;
          if (matches) {
            visibleCount += 1;
          }
        }

        if (emptyBox) {
          emptyBox.hidden = visibleCount > 0;
        }
      });
    }

    const selectButtons = root.querySelectorAll<HTMLElement>("[data-select-sku]");
    for (const selectBtn of selectButtons) {
      selectBtn.addEventListener("click", () => {
        const skuCode = selectBtn.getAttribute("data-select-sku") ?? "";
        const skuCat = selectBtn.getAttribute("data-sku-cat") ?? "";
        const skuName = selectBtn.getAttribute("data-sku-name") ?? "";
        const rawMinNok = Number(selectBtn.getAttribute("data-sku-min-nok"));
        const rawMaxNok = Number(selectBtn.getAttribute("data-sku-max-nok"));
        const minNok = Number.isFinite(rawMinNok) ? rawMinNok : 1000;
        const maxNok = Number.isFinite(rawMaxNok) ? rawMaxNok : 1500;
        const skuCert = selectBtn.getAttribute("data-sku-cert") ?? "";
        const skuPrefill = selectBtn.getAttribute("data-sku-prefill") ?? "";

        const parsedSku = SkuCodeSchema.safeParse(skuCode);
        if (parsedSku.success) {
          activeSelectedSkuCode = parsedSku.data;
        }

        const parsedCat = CategorySlugEnum.safeParse(skuCat);
        if (parsedCat.success) {
          const catSelect = document.querySelector<HTMLSelectElement>("[data-lead-category]");
          if (catSelect) {
            catSelect.value = parsedCat.data;
          }

          latestCalcSnapshot = {
            calculatorType: parsedCat.data,
            headlineSpec: `[${skuCode}] ${skuName}`.slice(0, 220),
            estimatedValueNokMin: Math.max(1000, Math.round(minNok)),
            estimatedValueNokMax: Math.max(1500, Math.round(maxNok)),
            complianceSummary: (skuCert || "Verifisert B2B-maskinklasse").slice(0, 260)
          };
        }

        latestPrefilledText = `[${skuCode}] ${skuPrefill}`;
        const descEl = document.querySelector<HTMLTextAreaElement>("[data-lead-desc]");
        if (descEl) {
          descEl.value = latestPrefilledText;
        }

        const banner = document.querySelector<HTMLElement>("[data-selected-sku-banner]");
        if (banner) {
          banner.hidden = false;
          banner.textContent = `Valgt maskinmodell: [${skuCode}] ${skuName} — teknisk spesifikasjon og prisestimat er lagt inn i forespørselen.`;
        }

        const formShell = document.querySelector<HTMLElement>("[data-lead-form-shell]");
        if (formShell) {
          formShell.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }
}

function initCalculatorWidgets(): void {
  const widgets = document.querySelectorAll<HTMLElement>("[data-calc-widget]");
  for (const widget of widgets) {
    renderCalculatorOutput(widget, computeActiveWidget(widget));

    const tabButtons = widget.querySelectorAll<HTMLButtonElement>("[data-calc-tab]");
    const panels = widget.querySelectorAll<HTMLElement>("[data-calc-panel]");

    for (const btn of tabButtons) {
      btn.addEventListener("click", () => {
        const targetCat = btn.getAttribute("data-calc-tab");
        if (!targetCat) return;
        widget.setAttribute("data-active-cat", targetCat);

        for (const b of tabButtons) {
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        }
        for (const panel of panels) {
          panel.hidden = panel.getAttribute("data-calc-panel") !== targetCat;
        }

        renderCalculatorOutput(widget, computeActiveWidget(widget));
      });
    }

    widget.addEventListener("input", () => {
      renderCalculatorOutput(widget, computeActiveWidget(widget));
    });
    widget.addEventListener("change", () => {
      renderCalculatorOutput(widget, computeActiveWidget(widget));
    });

    const transferBtn = widget.querySelector<HTMLButtonElement>("[data-transfer-calc]");
    if (transferBtn) {
      transferBtn.addEventListener("click", () => {
        const out = computeActiveWidget(widget);
        renderCalculatorOutput(widget, out);

        const descEl = document.querySelector<HTMLTextAreaElement>("[data-lead-desc]");
        const catSelect = document.querySelector<HTMLSelectElement>("[data-lead-category]");
        const formShell = document.querySelector<HTMLElement>("[data-lead-form-shell]");

        if (catSelect) {
          catSelect.value = out.calculatorType;
        }
        if (descEl) {
          descEl.value = latestPrefilledText;
        }
        if (formShell) {
          formShell.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }
}

function initLeadForms(): void {
  const form = document.querySelector<HTMLFormElement>("[data-lead-form]");
  if (!form) return;

  const orgInput = form.querySelector<HTMLInputElement>("[data-lead-orgnr]");
  const companyInput = form.querySelector<HTMLInputElement>("[data-lead-company]");
  const contactInput = form.querySelector<HTMLInputElement>("[data-lead-contact]");
  const phoneInput = form.querySelector<HTMLInputElement>("[data-lead-phone]");
  const municipalitySelect = form.querySelector<HTMLSelectElement>("[data-lead-municipality]");
  const categorySelect = form.querySelector<HTMLSelectElement>("[data-lead-category]");
  const postalInput = form.querySelector<HTMLInputElement>("[data-lead-postal]");
  const daysInput = form.querySelector<HTMLInputElement>("[data-lead-days]");
  const urgencySelect = form.querySelector<HTMLSelectElement>("[data-lead-urgency]");
  const descInput = form.querySelector<HTMLTextAreaElement>("[data-lead-desc]");
  const verifyBtn = form.querySelector<HTMLButtonElement>("[data-verify-org-btn]");
  const demoBtn = form.querySelector<HTMLButtonElement>("[data-fill-demo-lead]");
  const orgStatusBox = form.querySelector<HTMLElement>("[data-org-status]");
  const feedbackBox = form.querySelector<HTMLElement>("[data-lead-feedback]");
  const submitBtn = form.querySelector<HTMLButtonElement>("[data-lead-submit]");

  async function runOrgLookup(): Promise<void> {
    if (!orgInput || !orgStatusBox) return;
    const cleaned = orgInput.value.replace(/\s+/g, "");
    orgStatusBox.hidden = false;
    orgStatusBox.className = "status-banner status-warn";
    orgStatusBox.textContent = "Kontrollerer organisasjonsnummer mot Enhetsregisteret (Modulus-11)…";

    try {
      const res = await fetch(`/api/verify-org?orgnr=${encodeURIComponent(cleaned)}`);
      const rawJson: unknown = await res.json();

      if (!res.ok) {
        orgStatusBox.className = "status-banner status-err";
        const errMsg =
          typeof rawJson === "object" &&
          rawJson !== null &&
          "error" in rawJson &&
          typeof rawJson.error === "string"
            ? rawJson.error
            : "Ugyldig organisasjonsnummer.";
        orgStatusBox.textContent = errMsg;
        return;
      }

      const parsed = VerifiedOrgResponseSchema.safeParse(rawJson);
      if (!parsed.success) {
        orgStatusBox.className = "status-banner status-err";
        orgStatusBox.textContent = "Kunne ikke validere svar fra Enhetsregisteret.";
        return;
      }

      const info = parsed.data;
      if (companyInput) {
        companyInput.value = info.companyName;
      }
      orgStatusBox.className = info.ehfEligible
        ? "status-banner status-ok"
        : "status-banner status-warn";
      orgStatusBox.textContent = `${info.companyName} (${info.orgFormCode}) • ${
        info.vatRegistered ? "MVA-registrert" : "Ikke i MVA-reg."
      } • ${info.ehfEligible ? "Klar for EHF-fakturering" : "Manuell kredittsjekk"} • ${info.naceDescription}`;
    } catch {
      orgStatusBox.className = "status-banner status-err";
      orgStatusBox.textContent = "Nettverksfeil ved oppslag mot verifiseringstjeneste.";
    }
  }

  if (verifyBtn) {
    verifyBtn.addEventListener("click", () => {
      void runOrgLookup();
    });
  }

  if (demoBtn) {
    demoBtn.addEventListener("click", () => {
      if (orgInput) orgInput.value = "984024290";
      if (companyInput) companyInput.value = "VEIDEKKE ENTREPRENØR AS";
      if (contactInput) contactInput.value = "Henrik Bakken (Anleggsleder)";
      if (phoneInput) phoneInput.value = "91844210";
      if (descInput && descInput.value.trim().length < 10) {
        descInput.value =
          latestPrefilledText ||
          "Trenger 8,5t korthekker beltegraver med tiltrotator og 250 kg vibroplate levert kl 07:00 til VA-grøft.";
      }
      void runOrgLookup();
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!feedbackBox || !submitBtn) return;

    submitBtn.disabled = true;
    feedbackBox.hidden = false;
    feedbackBox.className = "status-banner status-warn";
    feedbackBox.textContent = "Validerer spesifikasjon og ruter til lokalt territorium…";

    const payload = {
      orgNr: orgInput?.value ?? "",
      companyName: companyInput?.value ?? "",
      contactName: contactInput?.value ?? "",
      phone: phoneInput?.value ?? "",
      municipalitySlug: municipalitySelect?.value ?? "nordre-follo-aas",
      categorySlug: categorySelect?.value ?? "maskinutleie",
      postalCode: postalInput?.value ?? "1430",
      durationDays: Number(daysInput?.value ?? "5"),
      urgency: urgencySelect?.value ?? "IMORGEN_0700",
      ...(activeSelectedSkuCode ? { selectedSkuCode: activeSelectedSkuCode } : {}),
      rawNeedDescription: descInput?.value ?? "",
      ...(latestCalcSnapshot ? { calculatorSnapshot: latestCalcSnapshot } : {})
    };

    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const rawJson: unknown = await res.json();

      if (!res.ok) {
        feedbackBox.className = "status-banner status-err";
        const msg =
          typeof rawJson === "object" &&
          rawJson !== null &&
          "error" in rawJson &&
          typeof rawJson.error === "string"
            ? rawJson.error
            : "Kontroller at alle felt (inkl. gyldig 9-sifret org.nr og 4-sifret postnr.) er fylt ut.";
        feedbackBox.textContent = msg;
        submitBtn.disabled = false;
        return;
      }

      const parsed = LeadDispatchConfirmationSchema.safeParse(rawJson);
      if (!parsed.success) {
        feedbackBox.className = "status-banner status-err";
        feedbackBox.textContent = "Uventet responsformat fra server.";
        submitBtn.disabled = false;
        return;
      }

      const conf = parsed.data;
      feedbackBox.className = "status-banner status-ok";
      feedbackBox.replaceChildren();

      const heading = document.createElement("strong");
      heading.textContent = `Registrert referanse ${conf.leadReferenceId} — Estimert oppdragsramme: ${conf.estimatedContractNokMin.toLocaleString(
        "nb-NO"
      )}–${conf.estimatedContractNokMax.toLocaleString("nb-NO")} kr eks. mva.`;

      const detail = document.createElement("p");
      detail.className = "card-text";
      detail.textContent = `Område: ${conf.municipalityName} (${conf.categoryTitle}) • Forventet responstid: innen ${conf.responseSlaMinutes} min • ${conf.localLogisticsNote}`;

      const routingInfo = document.createElement("p");
      routingInfo.className = "card-text";
      const skuSummary = conf.selectedSkuCode ? ` • Valgt modellkode: ${conf.selectedSkuCode}` : "";
      routingInfo.textContent = `Aktive rutingskanaler: ${conf.deliveryChannels.join(", ")}${skuSummary}`;

      const list = document.createElement("ul");
      list.className = "spec-list";
      for (const item of conf.complianceChecklist) {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      }

      feedbackBox.append(heading, detail, routingInfo, list);
    } catch {
      feedbackBox.className = "status-banner status-err";
      feedbackBox.textContent = "Kunne ikke koble til innsendingstjenesten.";
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function initQuickRouteFinder(): void {
  const quickForm = document.querySelector<HTMLFormElement>("[data-quick-route-form]");
  if (!quickForm) return;

  quickForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const munEl = quickForm.querySelector<HTMLSelectElement>("[data-quick-mun]");
    const catEl = quickForm.querySelector<HTMLSelectElement>("[data-quick-cat]");
    const mun = munEl?.value ?? "nordre-follo-aas";
    const cat = catEl?.value ?? "maskinutleie";
    window.location.assign(`/utleie/${encodeURIComponent(mun)}/${encodeURIComponent(cat)}/`);
  });
}

initQuickRouteFinder();
initSkuCatalogGrids();
initCalculatorWidgets();
initLeadForms();

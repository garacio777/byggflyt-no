import type { BusinessAccountView } from "../src/schemas/platform.ts";
import { checkbox, html, type SafeHtml } from "./html.ts";
import { CATEGORY_OPTIONS, MUNICIPALITY_OPTIONS } from "./marketplace.ts";

/** Profile form fields shared by registration, the partner profile page and admin editing. */
export function profileFields(b: BusinessAccountView | null): SafeHtml {
  const munis = new Set<string>(b?.municipalities ?? []);
  const cats = new Set<string>(b?.categories ?? []);
  return html`
<div class="grid2">
  <label>Kontaktperson <input name="contactName" required maxlength="100" value="${b?.contactName ?? ""}"></label>
  <label>Offentlig telefon <input name="publicPhone" required maxlength="20" value="${b?.publicPhone ?? ""}"></label>
  <label>Offentlig e-post <input type="email" name="publicEmail" required maxlength="140" value="${b?.publicEmail ?? ""}"></label>
  <label>Depot / poststed <input name="depotLocation" required maxlength="120" value="${b?.depotLocation ?? ""}"></label>
</div>
<label>Overskrift <input name="headline" required maxlength="160" value="${b?.headline ?? ""}"></label>
<label>Beskrivelse <textarea name="description" required maxlength="800" rows="4">${b?.description ?? ""}</textarea></label>
<fieldset><legend>Regioner</legend>${MUNICIPALITY_OPTIONS.map((o) => checkbox("municipalities", o.value, o.label, munis.has(o.value)))}</fieldset>
<fieldset><legend>Fagområder</legend>${CATEGORY_OPTIONS.map((o) => checkbox("categories", o.value, o.label, cats.has(o.value)))}</fieldset>
<div class="grid2">
  <label>Sertifiseringer (kommaseparert) <input name="certifications" maxlength="800" value="${(b?.certifications ?? []).join(", ")}"></label>
  <label>Responstid (minutter) <input type="number" name="responseSlaMinutes" min="10" max="240" value="${b?.responseSlaMinutes ?? 30}"></label>
  <label>Webhook-URL (https, valgfri) <input name="webhookUrl" maxlength="260" value="${b?.webhookUrl ?? ""}"></label>
</div>
${checkbox("zeroEmissionFleet", "on", "Utslippsfri maskinpark", b?.zeroEmissionFleet ?? false)}`;
}

export function statusBadge(status: string): SafeHtml {
  return html`<span class="badge badge-${status.toLowerCase()}">${status}</span>`;
}

export function labelFor(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

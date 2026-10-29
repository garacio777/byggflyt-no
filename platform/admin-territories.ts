import { AdminTerritoryActionSchema, TerritoryLeaseStatusEnum } from "../src/schemas/platform.ts";
import type { AdminKit } from "./admin-app.ts";
import type { Handler } from "./app.ts";
import { field, int, zodMessage } from "./forms.ts";
import { formatNok, html, selectOptions } from "./html.ts";
import { redirect, withFlash } from "./http.ts";
import { CATEGORY_OPTIONS, MUNICIPALITY_OPTIONS } from "./marketplace.ts";
import { statusBadge } from "./shared-views.ts";

const LEASE_OPTIONS = TerritoryLeaseStatusEnum.options.map((v) => ({ value: v, label: v }));
const AVAIL_OPTIONS = [
  { value: "AUTO", label: "Automatisk" },
  { value: "AVAILABLE_FOR_EXCLUSIVE_LEASE", label: "Ledig" },
  { value: "WAITLIST_ONLY", label: "Kun venteliste" }
];

export function adminTerritoryRoutes(kit: AdminKit): Record<string, Handler> {
  const { services, render } = kit;

  const listPage: Handler = (ctx) => {
    const csrf = kit.csrf(ctx);
    const slots = services.market.slots(services.cms.get());
    const approved = services.businesses.list().filter((b) => b.status === "APPROVED");
    const bizOptions = approved.map((b) => ({ value: b.id, label: `${b.companyName} (${b.orgNr})` }));

    const leaseRows = services.market.leases().map(
      (l) => html`<tr><td>${l.businessName}</td><td>${l.slotKey}</td><td>${formatNok(l.monthlyNok)}</td><td>${statusBadge(l.status)}</td><td>${l.notes}</td>
<td><form method="post" action="/territories" class="row">${csrf}<input type="hidden" name="action" value="SET_LEASE_STATUS">
<input type="hidden" name="leaseId" value="${l.id}"><select name="status">${selectOptions(LEASE_OPTIONS, l.status)}</select>
<input type="number" name="monthlyNok" value="${l.monthlyNok}"><button type="submit">Lagre</button></form></td></tr>`
    );

    const slotRows = slots.map(
      (s) => html`<tr><td>${s.municipalityName}</td><td>${s.categoryName}</td><td>${statusBadge(s.availability)}</td>
<td>${s.activeLease ? s.activeLease.businessName : html`<span class="muted">–</span>`}</td>
<td><form method="post" action="/territories" class="row">${csrf}<input type="hidden" name="action" value="CONFIGURE_SLOT">
<input type="hidden" name="slotKey" value="${s.slotKey}">
<input type="number" name="monthlyLeaseNok" value="${s.monthlyLeaseNok}">
<select name="availabilityOverride">${selectOptions(AVAIL_OPTIONS, s.statusOverride ?? "AUTO")}</select>
<button type="submit">Lagre</button></form></td></tr>`
    );

    const assignForm = bizOptions.length
      ? html`<form method="post" action="/territories" class="row">${csrf}<input type="hidden" name="action" value="ASSIGN_EXCLUSIVE">
<select name="municipalitySlug">${selectOptions(MUNICIPALITY_OPTIONS, null)}</select>
<select name="categorySlug">${selectOptions(CATEGORY_OPTIONS, null)}</select>
<select name="businessId">${selectOptions(bizOptions, null)}</select>
<input type="number" name="monthlyNok" placeholder="NOK/mnd" required>
<input name="notes" maxlength="400" placeholder="Notat"><button type="submit">Tildel eksklusivt</button></form>`
      : html`<p class="muted">Godkjenn en bedrift først.</p>`;

    const leaseTable = leaseRows.length
      ? html`<table><thead><tr><th>Bedrift</th><th>Område</th><th>Pris</th><th>Status</th><th>Notat</th><th></th></tr></thead><tbody>${leaseRows}</tbody></table>`
      : html`<p class="muted">Ingen forespørsler.</p>`;

    render(ctx, "Områder", html`<h1>Eksklusive områder</h1>
<section class="card"><h2>Forespørsler og avtaler</h2>${leaseTable}</section>
<section class="card"><h2>Tildel område</h2>${assignForm}</section>
<section class="card"><h2>Alle områder (${slots.length})</h2><table><thead><tr><th>Region</th><th>Fag</th><th>Status</th><th>Partner</th><th>Pris / tilgjengelighet</th></tr></thead><tbody>${slotRows}</tbody></table></section>`);
  };

  const act: Handler = (ctx, form) => {
    if (!form) return;
    const action = field(form, "action");
    let input: Record<string, unknown>;
    if (action === "SET_LEASE_STATUS") {
      input = { action, leaseId: field(form, "leaseId"), status: field(form, "status"), monthlyNok: int(form, "monthlyNok") };
    } else if (action === "ASSIGN_EXCLUSIVE") {
      input = {
        action,
        municipalitySlug: field(form, "municipalitySlug"),
        categorySlug: field(form, "categorySlug"),
        businessId: field(form, "businessId"),
        monthlyNok: int(form, "monthlyNok"),
        notes: field(form, "notes")
      };
    } else {
      input = {
        action,
        slotKey: field(form, "slotKey"),
        monthlyLeaseNok: int(form, "monthlyLeaseNok"),
        availabilityOverride: field(form, "availabilityOverride") || undefined
      };
    }
    const parsed = AdminTerritoryActionSchema.safeParse(input);
    if (!parsed.success) return redirect(ctx.res, withFlash("/territories", "err", zodMessage(parsed.error)));
    const a = parsed.data;

    if (a.action === "SET_LEASE_STATUS") {
      const n = services.market.setLeaseStatus(a.leaseId, a.status, a.monthlyNok);
      return redirect(ctx.res, withFlash("/territories", n ? "ok" : "err", n ? "Avtale oppdatert." : "Fant ikke avtalen."));
    }
    if (a.action === "ASSIGN_EXCLUSIVE") {
      const biz = services.businesses.find(a.businessId);
      if (!biz || biz.status !== "APPROVED") return redirect(ctx.res, withFlash("/territories", "err", "Bedriften må være godkjent."));
      services.market.assignExclusive(a.municipalitySlug, a.categorySlug, a.businessId, a.monthlyNok, a.notes);
      return redirect(ctx.res, withFlash("/territories", "ok", "Område tildelt."));
    }
    const valid = services.market.slots(services.cms.get()).some((s) => s.slotKey === a.slotKey);
    if (!valid) return redirect(ctx.res, withFlash("/territories", "err", "Ukjent område."));
    const error = services.cms.update((draft) => {
      const prices = { ...draft.slotPriceOverrides };
      const statuses = { ...draft.slotStatusOverrides };
      if (a.monthlyLeaseNok !== undefined) prices[a.slotKey] = a.monthlyLeaseNok;
      if (a.availabilityOverride === "AUTO") delete statuses[a.slotKey];
      else if (a.availabilityOverride) statuses[a.slotKey] = a.availabilityOverride;
      return { ...draft, slotPriceOverrides: prices, slotStatusOverrides: statuses };
    });
    redirect(ctx.res, withFlash("/territories", error ? "err" : "ok", error ?? "Område lagret (publiser via Innhold)."));
  };

  return { "GET /territories": listPage, "POST /territories": act };
}

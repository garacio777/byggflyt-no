import {
  BusinessProfileUpdateRequestSchema,
  LeadStageEnum,
  PartnerEquipmentActionSchema,
  PartnerLeadUpdateSchema,
  PartnerLeaseRequestSchema,
  type BusinessAccountView
} from "../src/schemas/platform.ts";
import { createApp, endSession, type Handler, type RequestContext, type Services } from "./app.ts";
import { EQUIPMENT_FIELDS } from "./field-specs.ts";
import { input } from "./form-views.ts";
import { checked, commaList, field, int, list, zodMessage } from "./forms.ts";
import { checkbox, csrfField, formatNok, html, page, selectOptions, type SafeHtml } from "./html.ts";
import { HttpError, redirect, sendHtml, withFlash } from "./http.ts";
import { CATEGORY_OPTIONS, MUNICIPALITY_OPTIONS, slotKeyFor } from "./marketplace.ts";
import { PARTNER_COOKIE, partnerAuthRoutes } from "./partner-auth.ts";
import { labelFor, profileFields, statusBadge } from "./shared-views.ts";

const BRAND = "ByggFlyt Bedriftsportal";

export type PartnerRender = (ctx: RequestContext, title: string, body: SafeHtml, status?: number) => void;

export function profileInput(form: URLSearchParams): Record<string, unknown> {
  return {
    contactName: field(form, "contactName"),
    publicPhone: field(form, "publicPhone"),
    publicEmail: field(form, "publicEmail"),
    depotLocation: field(form, "depotLocation"),
    headline: field(form, "headline"),
    description: field(form, "description"),
    municipalities: list(form, "municipalities"),
    categories: list(form, "categories"),
    certifications: commaList(form, "certifications"),
    zeroEmissionFleet: checked(form, "zeroEmissionFleet"),
    responseSlaMinutes: int(form, "responseSlaMinutes"),
    webhookUrl: field(form, "webhookUrl")
  };
}

export function createPartnerApp(services: Services) {
  const session = { cookieName: PARTNER_COOKIE, services };

  function nav(ctx: RequestContext): SafeHtml {
    if (!ctx.subjectId) {
      return html`<nav><a href="/login">Logg inn</a><a href="/register">Ny bedriftskonto</a></nav>`;
    }
    return html`<nav><a href="/dashboard">Oversikt</a><form method="post" action="/logout" class="inline">${csrfField(ctx.csrf)}<button class="link" type="submit">Logg ut</button></form></nav>`;
  }

  const render: PartnerRender = (ctx, title, body, status = 200) => {
    sendHtml(ctx.res, status, page({ title, brand: BRAND, nav: nav(ctx), flashOk: ctx.flashOk, flashErr: ctx.flashErr, body }));
  };

  /** The logged-in business. Every partner query below is scoped to this id (tenant isolation). */
  function current(ctx: RequestContext): BusinessAccountView {
    const business = ctx.subjectId ? services.businesses.find(ctx.subjectId) : null;
    if (!business) throw new HttpError(401, "Du må logge inn.");
    if (business.status === "SUSPENDED") throw new HttpError(403, "Kontoen er suspendert. Kontakt ByggFlyt.");
    return business;
  }

  const home: Handler = (ctx) => redirect(ctx.res, ctx.subjectId ? "/dashboard" : "/login");

  const logout: Handler = (ctx) => endSession(ctx, session, "/login");

  const dashboard: Handler = (ctx) => {
    if (!ctx.subjectId) return redirect(ctx.res, "/login");
    const b = current(ctx);
    const cms = services.cms.get();
    const equipment = services.market.equipmentFor(b.id);
    const leases = services.market.leasesFor(b.id);
    const leads = services.market.leadsFor(b.id);
    const slots = services.market.slots(cms).filter(
      (s) => b.municipalities.includes(s.municipalitySlug) && b.categories.includes(s.categorySlug)
    );
    const csrf = csrfField(ctx.csrf);

    const statusNote =
      b.status === "PENDING"
        ? html`<p class="flash warn">Kontoen venter på godkjenning. Profilen vises ikke offentlig før den er godkjent.</p>`
        : "";

    const equipmentRows = equipment.map(
      (e) => html`<tr><td>${e.modelName}</td><td>${labelFor(MUNICIPALITY_OPTIONS, e.municipalitySlug)}</td>
<td>${labelFor(CATEGORY_OPTIONS, e.categorySlug)}</td><td>${formatNok(e.dailyRateNok)}</td><td>${statusBadge(e.status)}</td>
<td><form method="post" action="/equipment" class="inline">${csrf}<input type="hidden" name="action" value="DELETE">
<input type="hidden" name="equipmentId" value="${e.id}"><button class="danger" type="submit">Slett</button></form></td></tr>`
    );

    const slotRows = slots.map(
      (s) => html`<tr><td>${s.municipalityName}</td><td>${s.categoryName}</td><td>${formatNok(s.monthlyLeaseNok)}/mnd</td>
<td>${s.estMonthlyLeadsMin}–${s.estMonthlyLeadsMax}</td><td>${statusBadge(s.availability)}</td></tr>`
    );

    const leaseRows = leases.map(
      (l) => html`<tr><td>${labelFor(MUNICIPALITY_OPTIONS, l.municipalitySlug)}</td><td>${labelFor(CATEGORY_OPTIONS, l.categorySlug)}</td>
<td>${formatNok(l.monthlyNok)}</td><td>${statusBadge(l.status)}</td><td>${l.notes}</td></tr>`
    );

    const stageOptions = LeadStageEnum.options.map((v) => ({ value: v, label: v }));
    const leadRows = leads.map(
      (l) => html`<tr><td>${l.leadReferenceId}</td><td>${l.companyName}<br><span class="muted">${l.contactName} · ${l.phone}</span></td>
<td>${l.rawNeedDescription}</td><td>${formatNok(l.estimatedContractNokMin)}–${formatNok(l.estimatedContractNokMax)}</td>
<td><form method="post" action="/leads">${csrf}<input type="hidden" name="leadReferenceId" value="${l.leadReferenceId}">
<select name="leadStage">${selectOptions(stageOptions, l.leadStage)}</select>
<input name="partnerNotes" maxlength="500" value="${l.partnerNotes}"><button type="submit">Lagre</button></form></td></tr>`
    );

    const leadsTable = leads.length
      ? html`<table><thead><tr><th>Ref</th><th>Kunde</th><th>Behov</th><th>Estimat</th><th>Status</th></tr></thead><tbody>${leadRows}</tbody></table>`
      : html`<p class="muted">Ingen leads ennå.</p>`;
    const leasesTable = leases.length
      ? html`<table><thead><tr><th>Region</th><th>Fag</th><th>Pris</th><th>Status</th><th>Notat</th></tr></thead><tbody>${leaseRows}</tbody></table>`
      : "";
    const slotsTable = html`<table><thead><tr><th>Region</th><th>Fag</th><th>Pris</th><th>Leads/mnd</th><th>Status</th></tr></thead><tbody>${slotRows}</tbody></table>`;
    const equipmentTable = equipment.length
      ? html`<table><thead><tr><th>Modell</th><th>Region</th><th>Fag</th><th>Dagpris</th><th>Status</th><th></th></tr></thead><tbody>${equipmentRows}</tbody></table>`
      : html`<p class="muted">Ingen maskiner registrert.</p>`;

    const leaseForm = html`<form method="post" action="/leases" class="row">${csrf}
<select name="municipalitySlug">${selectOptions(MUNICIPALITY_OPTIONS, null)}</select>
<select name="categorySlug">${selectOptions(CATEGORY_OPTIONS, null)}</select>
<input name="notes" required maxlength="400" placeholder="Notat">
<button type="submit">Send</button></form>`;

    const equipmentForm = html`<form method="post" action="/equipment">${csrf}<input type="hidden" name="action" value="CREATE">
${EQUIPMENT_FIELDS.map(input)}
<label>Region <select name="municipalitySlug">${selectOptions(MUNICIPALITY_OPTIONS, null)}</select></label>
<label>Fag <select name="categorySlug">${selectOptions(CATEGORY_OPTIONS, null)}</select></label>
${checkbox("zeroEmission", "on", "Utslippsfri", false)}
<button type="submit">Legg til</button></form>`;

    const profileForm = html`<form method="post" action="/profile">${csrf}${profileFields(b)}<button type="submit">Lagre profil</button></form>`;

    const body = html`<h1>${b.companyName}</h1><p class="muted">Org.nr ${b.orgNr} ${statusBadge(b.status)}</p>${statusNote}
<section class="card"><h2>Leads (${leads.length})</h2>${leadsTable}</section>
<section class="card"><h2>Eksklusive områder</h2>${leasesTable}<h3>Områder i deres regioner</h3>${slotsTable}${leaseForm}</section>
<section class="card"><h2>Maskiner</h2>${equipmentTable}<h3>Ny maskin</h3>${equipmentForm}</section>
<section class="card"><h2>Profil</h2>${profileForm}</section>`;
    render(ctx, "Oversikt", body);
  };

  const saveProfile: Handler = (ctx, form) => {
    if (!form) return;
    const b = current(ctx);
    const parsed = BusinessProfileUpdateRequestSchema.safeParse(profileInput(form));
    if (!parsed.success) return redirect(ctx.res, withFlash("/dashboard", "err", zodMessage(parsed.error)));
    services.businesses.updateProfile(b.id, parsed.data);
    redirect(ctx.res, withFlash("/dashboard", "ok", "Profil lagret."));
  };

  const equipmentAction: Handler = (ctx, form) => {
    if (!form) return;
    const b = current(ctx);
    const action = field(form, "action");
    const parsed = PartnerEquipmentActionSchema.safeParse(
      action === "DELETE"
        ? { action, equipmentId: field(form, "equipmentId") }
        : {
            action,
            municipalitySlug: field(form, "municipalitySlug"),
            categorySlug: field(form, "categorySlug"),
            modelName: field(form, "modelName"),
            powertrainLabel: field(form, "powertrainLabel"),
            zeroEmission: checked(form, "zeroEmission"),
            dailyRateNok: int(form, "dailyRateNok"),
            weeklyRateNok: int(form, "weeklyRateNok"),
            specsSummary: field(form, "specsSummary")
          }
    );
    if (!parsed.success) return redirect(ctx.res, withFlash("/dashboard", "err", zodMessage(parsed.error)));
    if (parsed.data.action === "DELETE") {
      const n = services.market.deleteEquipment(parsed.data.equipmentId, b.id);
      return redirect(ctx.res, withFlash("/dashboard", n ? "ok" : "err", n ? "Maskin slettet." : "Fant ikke maskinen."));
    }
    const { action: _ignored, ...item } = parsed.data;
    const status = services.cms.get().autoApproveEquipment ? "APPROVED" : "PENDING";
    services.market.addEquipment(b.id, item, status);
    redirect(ctx.res, withFlash("/dashboard", "ok", "Maskin lagt til."));
  };

  const requestLease: Handler = (ctx, form) => {
    if (!form) return;
    const b = current(ctx);
    if (b.status !== "APPROVED") return redirect(ctx.res, withFlash("/dashboard", "err", "Kontoen må være godkjent først."));
    const parsed = PartnerLeaseRequestSchema.safeParse({
      municipalitySlug: field(form, "municipalitySlug"),
      categorySlug: field(form, "categorySlug"),
      notes: field(form, "notes")
    });
    if (!parsed.success) return redirect(ctx.res, withFlash("/dashboard", "err", zodMessage(parsed.error)));
    const { municipalitySlug, categorySlug, notes } = parsed.data;
    const key = slotKeyFor(municipalitySlug, categorySlug);
    const slot = services.market.slots(services.cms.get()).find((s) => s.slotKey === key);
    if (!slot || slot.availability !== "AVAILABLE_FOR_EXCLUSIVE_LEASE") {
      return redirect(ctx.res, withFlash("/dashboard", "err", "Området er ikke ledig."));
    }
    if (services.market.hasOpenLeaseRequest(b.id, key)) {
      return redirect(ctx.res, withFlash("/dashboard", "err", "Dere har allerede en forespørsel på dette området."));
    }
    services.market.requestLease(b.id, municipalitySlug, categorySlug, slot.monthlyLeaseNok, notes);
    redirect(ctx.res, withFlash("/dashboard", "ok", "Forespørsel sendt til ByggFlyt."));
  };

  const updateLead: Handler = (ctx, form) => {
    if (!form) return;
    const b = current(ctx);
    const parsed = PartnerLeadUpdateSchema.safeParse({
      leadReferenceId: field(form, "leadReferenceId"),
      leadStage: field(form, "leadStage"),
      partnerNotes: field(form, "partnerNotes")
    });
    if (!parsed.success) return redirect(ctx.res, withFlash("/dashboard", "err", zodMessage(parsed.error)));
    const ok = services.market.updateLeadStage(parsed.data.leadReferenceId, parsed.data.leadStage, parsed.data.partnerNotes, b.id);
    redirect(ctx.res, withFlash("/dashboard", ok ? "ok" : "err", ok ? "Lead oppdatert." : "Fant ikke lead."));
  };

  return createApp({
    realm: "partner",
    brand: BRAND,
    cookieName: PARTNER_COOKIE,
    services,
    publicPosts: ["/login", "/register"],
    routes: {
      ...partnerAuthRoutes(services, render),
      "GET /": home,
      "GET /dashboard": dashboard,
      "POST /logout": logout,
      "POST /profile": saveProfile,
      "POST /equipment": equipmentAction,
      "POST /leases": requestLease,
      "POST /leads": updateLead
    }
  });
}

import { AdminBusinessActionSchema, BusinessStatusEnum } from "../src/schemas/platform.ts";
import type { AdminKit } from "./admin-app.ts";
import type { Handler } from "./app.ts";
import { checked, field, zodMessage } from "./forms.ts";
import { RESET_PARTNER_FIELDS } from "./field-specs.ts";
import { simpleForm } from "./form-views.ts";
import { checkbox, html, selectOptions } from "./html.ts";
import { HttpError, redirect, withFlash } from "./http.ts";
import { profileInput } from "./partner-app.ts";
import { profileFields, statusBadge } from "./shared-views.ts";

const STATUS_OPTIONS = BusinessStatusEnum.options.map((v) => ({ value: v, label: v }));

export function adminBusinessRoutes(kit: AdminKit): Record<string, Handler> {
  const { services, render } = kit;

  const listPage: Handler = (ctx) => {
    const csrf = kit.csrf(ctx);
    const rows = services.businesses.list().map(
      (b) => html`<tr><td><a href="/businesses/edit?id=${b.id}">${b.companyName}</a><br><span class="muted">${b.orgNr} · ${b.email}</span></td>
<td>${statusBadge(b.status)}${b.featured ? html` <span class="badge">FEATURED</span>` : ""}</td>
<td><form method="post" action="/businesses" class="row">${csrf}<input type="hidden" name="action" value="SET_STATUS">
<input type="hidden" name="businessId" value="${b.id}"><select name="status">${selectOptions(STATUS_OPTIONS, b.status)}</select>
${checkbox("featured", "on", "Fremhevet", b.featured)}<button type="submit">Lagre</button></form></td>
<td><form method="post" action="/businesses" class="inline">${csrf}<input type="hidden" name="action" value="DELETE">
<input type="hidden" name="businessId" value="${b.id}"><button class="danger" type="submit">Slett</button></form></td></tr>`
    );
    const table = rows.length
      ? html`<table><thead><tr><th>Bedrift</th><th>Status</th><th>Moderering</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
      : html`<p class="muted">Ingen bedrifter registrert ennå.</p>`;
    render(ctx, "Bedrifter", html`<h1>Bedrifter</h1><section class="card">${table}</section>`);
  };

  const editPage: Handler = (ctx) => {
    const b = services.businesses.find(ctx.url.searchParams.get("id") ?? "");
    if (!b) throw new HttpError(404, "Fant ikke bedriften.");
    const csrf = kit.csrf(ctx);
    const hidden = html`${csrf}<input type="hidden" name="businessId" value="${b.id}">`;
    const details = html`<form method="post" action="/businesses">${hidden}<input type="hidden" name="action" value="UPDATE_DETAILS">
<label>Firmanavn <input name="companyName" required maxlength="140" value="${b.companyName}"></label>
<label>Status <select name="status">${selectOptions(STATUS_OPTIONS, b.status)}</select></label>
${checkbox("featured", "on", "Fremhevet", b.featured)}
${profileFields(b)}<button type="submit">Lagre</button></form>`;
    const reset = simpleForm("/businesses", RESET_PARTNER_FIELDS, "Sett nytt passord", html`${hidden}<input type="hidden" name="action" value="RESET_PARTNER_ACCESS">`);
    render(ctx, b.companyName, html`<h1>${b.companyName}</h1><p class="muted">${b.orgNr} · ${b.email}</p>
<section class="card"><h2>Detaljer</h2>${details}</section>
<section class="card narrow"><h2>Tilgang</h2>${reset}</section>`);
  };

  const act: Handler = (ctx, form) => {
    if (!form) return;
    const action = field(form, "action");
    const businessId = field(form, "businessId");
    let input: Record<string, unknown>;
    if (action === "SET_STATUS") {
      input = { action, businessId, status: field(form, "status"), featured: checked(form, "featured") };
    } else if (action === "UPDATE_DETAILS") {
      input = {
        ...profileInput(form),
        action,
        businessId,
        companyName: field(form, "companyName"),
        featured: checked(form, "featured"),
        status: field(form, "status")
      };
    } else if (action === "RESET_PARTNER_ACCESS") {
      input = { action, businessId, newPassword: field(form, "newPassword") };
    } else {
      input = { action, businessId };
    }
    const back = action === "UPDATE_DETAILS" || action === "RESET_PARTNER_ACCESS" ? `/businesses/edit?id=${encodeURIComponent(businessId)}` : "/businesses";
    const parsed = AdminBusinessActionSchema.safeParse(input);
    if (!parsed.success) return redirect(ctx.res, withFlash(back, "err", zodMessage(parsed.error)));

    const a = parsed.data;
    switch (a.action) {
      case "SET_STATUS":
        services.businesses.setStatus(a.businessId, a.status, a.featured);
        if (a.status === "SUSPENDED") services.sessions.destroyAllFor("partner", a.businessId);
        return redirect(ctx.res, withFlash(back, "ok", "Status oppdatert."));
      case "UPDATE_DETAILS": {
        const { action: _a, businessId: id, ...rest } = a;
        services.businesses.adminUpdate(id, rest);
        return redirect(ctx.res, withFlash(back, "ok", "Bedrift oppdatert."));
      }
      case "RESET_PARTNER_ACCESS":
        services.businesses.resetPassword(a.businessId, a.newPassword);
        services.sessions.destroyAllFor("partner", a.businessId);
        return redirect(ctx.res, withFlash(back, "ok", "Nytt passord satt. Bedriften er logget ut."));
      case "DELETE":
        services.sessions.destroyAllFor("partner", a.businessId);
        services.businesses.delete(a.businessId);
        return redirect(ctx.res, withFlash("/businesses", "ok", "Bedrift slettet."));
    }
  };

  return { "GET /businesses": listPage, "GET /businesses/edit": editPage, "POST /businesses": act };
}

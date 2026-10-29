import { BASE_EQUIPMENT_SKUS } from "../src/data/skus.ts";
import { AdminEquipmentActionSchema, PartnerEquipmentStatusEnum } from "../src/schemas/platform.ts";
import type { AdminKit } from "./admin-app.ts";
import type { Handler } from "./app.ts";
import { checked, field, int, zodMessage } from "./forms.ts";
import { checkbox, formatNok, html, selectOptions } from "./html.ts";
import { redirect, withFlash } from "./http.ts";
import { CATEGORY_OPTIONS, MUNICIPALITY_OPTIONS } from "./marketplace.ts";
import { labelFor, statusBadge } from "./shared-views.ts";

const MOD_OPTIONS = PartnerEquipmentStatusEnum.options.map((v) => ({ value: v, label: v }));

export function adminEquipmentRoutes(kit: AdminKit): Record<string, Handler> {
  const { services, render } = kit;

  const listPage: Handler = (ctx) => {
    const csrf = kit.csrf(ctx);
    const cms = services.cms.get();
    const partnerRows = services.market.equipment().map(
      (e) => html`<tr><td>${e.modelName}<br><span class="muted">${e.businessName}</span></td>
<td>${labelFor(MUNICIPALITY_OPTIONS, e.municipalitySlug)} · ${labelFor(CATEGORY_OPTIONS, e.categorySlug)}</td>
<td>${formatNok(e.dailyRateNok)}</td><td>${statusBadge(e.status)}</td>
<td><form method="post" action="/equipment" class="row">${csrf}<input type="hidden" name="action" value="MODERATE_PARTNER_ITEM">
<input type="hidden" name="equipmentId" value="${e.id}"><select name="status">${selectOptions(MOD_OPTIONS, e.status)}</select><button type="submit">Lagre</button></form>
<form method="post" action="/equipment" class="inline">${csrf}<input type="hidden" name="action" value="DELETE_PARTNER_ITEM">
<input type="hidden" name="equipmentId" value="${e.id}"><button class="danger" type="submit">Slett</button></form></td></tr>`
    );

    const skuRows = BASE_EQUIPMENT_SKUS.map((s) => {
      const ov = cms.skuRateOverrides[s.skuCode] ?? {};
      return html`<tr><td>${s.name}<br><span class="muted">${s.skuCode}</span></td>
<td colspan="4"><form method="post" action="/equipment" class="row">${csrf}<input type="hidden" name="action" value="OVERRIDE_CORE_SKU">
<input type="hidden" name="skuCode" value="${s.skuCode}">
<label>Dag <input type="number" name="dailyRateNok" value="${ov.dailyRateNok ?? s.dailyRateNok}"></label>
<label>Uke <input type="number" name="weeklyRateNok" value="${ov.weeklyRateNok ?? s.weeklyRateNok}"></label>
<label>Måned <input type="number" name="monthlyRateNok" value="${ov.monthlyRateNok ?? s.monthlyRateNok}"></label>
${checkbox("featured", "on", "Fremhevet", ov.featured ?? s.featured)}${checkbox("hidden", "on", "Skjult", ov.hidden ?? false)}
<button type="submit">Lagre</button></form></td></tr>`;
    });

    const partnerTable = partnerRows.length
      ? html`<table><thead><tr><th>Maskin</th><th>Område</th><th>Dagpris</th><th>Status</th><th>Moderering</th></tr></thead><tbody>${partnerRows}</tbody></table>`
      : html`<p class="muted">Ingen maskiner fra bedrifter ennå.</p>`;
    render(ctx, "Maskiner", html`<h1>Maskiner</h1>
<section class="card"><h2>Fra bedrifter</h2>${partnerTable}</section>
<section class="card"><h2>Kjernekatalog (priser publiseres via Innhold → Publiser)</h2><table><tbody>${skuRows}</tbody></table></section>`);
  };

  const act: Handler = (ctx, form) => {
    if (!form) return;
    const action = field(form, "action");
    const parsed = AdminEquipmentActionSchema.safeParse(
      action === "OVERRIDE_CORE_SKU"
        ? {
            action,
            skuCode: field(form, "skuCode"),
            dailyRateNok: int(form, "dailyRateNok"),
            weeklyRateNok: int(form, "weeklyRateNok"),
            monthlyRateNok: int(form, "monthlyRateNok"),
            featured: checked(form, "featured"),
            hidden: checked(form, "hidden")
          }
        : action === "MODERATE_PARTNER_ITEM"
          ? { action, equipmentId: field(form, "equipmentId"), status: field(form, "status") }
          : { action, equipmentId: field(form, "equipmentId") }
    );
    if (!parsed.success) return redirect(ctx.res, withFlash("/equipment", "err", zodMessage(parsed.error)));
    const a = parsed.data;
    if (a.action === "MODERATE_PARTNER_ITEM") {
      services.market.moderateEquipment(a.equipmentId, a.status);
      return redirect(ctx.res, withFlash("/equipment", "ok", "Maskin moderert."));
    }
    if (a.action === "DELETE_PARTNER_ITEM") {
      services.market.deleteEquipment(a.equipmentId, null);
      return redirect(ctx.res, withFlash("/equipment", "ok", "Maskin slettet."));
    }
    const { action: _a, skuCode, ...rates } = a;
    const error = services.cms.update((draft) => ({ ...draft, skuRateOverrides: { ...draft.skuRateOverrides, [skuCode]: rates } }));
    redirect(ctx.res, withFlash("/equipment", error ? "err" : "ok", error ?? `Pris for ${skuCode} lagret (ikke publisert ennå).`));
  };

  return { "GET /equipment": listPage, "POST /equipment": act };
}

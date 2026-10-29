import type { AdminKit } from "./admin-app.ts";
import type { Handler } from "./app.ts";
import { checked, field } from "./forms.ts";
import { checkbox, html } from "./html.ts";
import { redirect, withFlash } from "./http.ts";

const TEXT_FIELDS = [
  ["announcementBanner", "Kunngjøringsbanner (tom = skjult)", 240],
  ["heroBadgeText", "Hero-merke", 80],
  ["heroTitle", "Hero-tittel", 200],
  ["heroLead", "Hero-ingress", 480],
  ["partnerCalloutTitle", "Partner-tittel", 180],
  ["partnerCalloutLead", "Partner-ingress", 360],
  ["footerTagline", "Bunntekst", 160]
] as const;

const TOGGLES = [
  ["autoApproveBusinesses", "Godkjenn nye bedrifter automatisk"],
  ["autoApproveEquipment", "Godkjenn nye maskiner automatisk"],
  ["autoRouteLeadsToExclusivePartner", "Send leads automatisk til eksklusiv partner"]
] as const;

export function adminCmsRoutes(kit: AdminKit): Record<string, Handler> {
  const { services, render } = kit;

  const editPage: Handler = (ctx) => {
    const cms = services.cms.get();
    const csrf = kit.csrf(ctx);
    const texts = TEXT_FIELDS.map(
      ([key, label, max]) => html`<label>${label}<textarea name="${key}" maxlength="${max}" rows="2">${cms[key]}</textarea></label>`
    );
    const toggles = TOGGLES.map(([key, label]) => checkbox(key, "on", label, cms[key]));
    render(ctx, "Innhold", html`<h1>Innhold og regler</h1>
<section class="card"><form method="post" action="/cms">${csrf}${texts}<fieldset><legend>Automatisering</legend>${toggles}</fieldset>
<button type="submit">Lagre</button></form></section>
<section class="card"><h2>Publiser til nettstedet</h2>
<p>Skriver gjeldende innhold, priser og områdestatus til <code>src/data/cms-overrides.json</code>. Endringen går live ved neste bygg/deploy (commit og push).</p>
<form method="post" action="/cms/publish">${csrf}<button type="submit">Publiser</button></form></section>`);
  };

  const save: Handler = (ctx, form) => {
    if (!form) return;
    const error = services.cms.update((draft) => {
      const next = { ...draft };
      for (const [key] of TEXT_FIELDS) next[key] = field(form, key).trim();
      for (const [key] of TOGGLES) next[key] = checked(form, key);
      return next;
    });
    redirect(ctx.res, withFlash("/cms", error ? "err" : "ok", error ?? "Lagret (ikke publisert ennå)."));
  };

  const publish: Handler = (ctx) => {
    const file = services.cms.publish();
    redirect(ctx.res, withFlash("/cms", "ok", `Publisert til ${file}. Bygg og deploy for å gå live.`));
  };

  return { "GET /cms": editPage, "POST /cms": save, "POST /cms/publish": publish };
}

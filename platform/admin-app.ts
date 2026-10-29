import { AdminLoginRequestSchema, AdminRotateAccessSchema } from "../src/schemas/platform.ts";
import { createApp, endSession, startSession, type Handler, type RequestContext, type Services } from "./app.ts";
import { ADMIN_LINKS, linkList } from "./admin-nav.ts";
import { ADMIN_ROTATE_FIELDS, ADMIN_SIGN_IN_FIELDS } from "./field-specs.ts";
import { field, zodMessage } from "./forms.ts";
import { simpleForm } from "./form-views.ts";
import { csrfField, html, page, type SafeHtml } from "./html.ts";
import { clientIp, redirect, sendHtml, withFlash } from "./http.ts";
import { LoginThrottle } from "./security.ts";
import { adminBusinessRoutes } from "./admin-businesses.ts";
import { adminCmsRoutes } from "./admin-cms.ts";
import { adminEquipmentRoutes } from "./admin-equipment.ts";
import { adminLeadRoutes } from "./admin-leads.ts";
import { adminTerritoryRoutes } from "./admin-territories.ts";

const BRAND = "ByggFlyt Admin";
export const ADMIN_COOKIE = "bf_admin_session";
const throttle = new LoginThrottle(5, 15 * 60 * 1000);

export type AdminRender = (ctx: RequestContext, title: string, body: SafeHtml) => void;

export interface AdminKit {
  readonly services: Services;
  readonly render: AdminRender;
  /** Admin username for the current request (throws a redirect-worthy null if absent). */
  readonly csrf: (ctx: RequestContext) => SafeHtml;
}

export function createAdminKit(services: Services): AdminKit {
  function nav(ctx: RequestContext): SafeHtml {
    if (!ctx.subjectId) return html``;
    const signOut = html`<form method="post" action="/logout" class="inline">${csrfField(ctx.csrf)}<button class="link" type="submit">Logg ut</button></form>`;
    return html`<nav>${linkList(ADMIN_LINKS)}${signOut}</nav>`;
  }
  const render: AdminRender = (ctx, title, body) => {
    sendHtml(ctx.res, 200, page({ title, brand: BRAND, nav: nav(ctx), flashOk: ctx.flashOk, flashErr: ctx.flashErr, body }));
  };
  return { services, render, csrf: (ctx) => csrfField(ctx.csrf) };
}

export function adminAuthRoutes(kit: AdminKit): Record<string, Handler> {
  const { services, render } = kit;
  const session = { realm: "admin" as const, cookieName: ADMIN_COOKIE, services };

  const signInPage: Handler = (ctx) => {
    if (ctx.subjectId) return redirect(ctx.res, "/");
    render(ctx, "Admin", html`<section class="card narrow"><h1>Admin</h1>${simpleForm("/login", ADMIN_SIGN_IN_FIELDS, "Logg inn")}</section>`);
  };

  const signIn: Handler = (ctx, form) => {
    if (!form) return;
    const key = clientIp(ctx.req);
    if (throttle.isBlocked(key)) return redirect(ctx.res, withFlash("/login", "err", "For mange forsøk. Vent 15 minutter."));
    const parsed = AdminLoginRequestSchema.safeParse({ username: field(form, "username"), accessCode: field(form, "accessCode") });
    if (!parsed.success || !services.admins.authenticate(parsed.data.username, parsed.data.accessCode)) {
      throttle.recordFailure(key);
      return redirect(ctx.res, withFlash("/login", "err", "Ugyldig brukernavn eller kode."));
    }
    throttle.reset(key);
    startSession(ctx, session, parsed.data.username, "/");
  };

  const signOut: Handler = (ctx) => endSession(ctx, session, "/login");

  const settingsPage: Handler = (ctx) => {
    render(ctx, "Innstillinger", html`<section class="card narrow"><h1>Bytt tilgangskode</h1>${simpleForm("/settings", ADMIN_ROTATE_FIELDS, "Bytt kode", kit.csrf(ctx))}</section>`);
  };

  const rotate: Handler = (ctx, form) => {
    if (!form || !ctx.subjectId) return;
    const parsed = AdminRotateAccessSchema.safeParse({
      currentAccessCode: field(form, "currentAccessCode"),
      newAccessCode: field(form, "newAccessCode")
    });
    if (!parsed.success) return redirect(ctx.res, withFlash("/settings", "err", zodMessage(parsed.error)));
    if (!services.admins.authenticate(ctx.subjectId, parsed.data.currentAccessCode)) {
      return redirect(ctx.res, withFlash("/settings", "err", "Nåværende kode er feil."));
    }
    services.admins.rotate(ctx.subjectId, parsed.data.newAccessCode);
    services.sessions.destroyAllFor("admin", ctx.subjectId);
    redirect(ctx.res, withFlash("/login", "ok", "Koden er byttet. Logg inn på nytt."));
  };

  return { "GET /login": signInPage, "POST /login": signIn, "POST /logout": signOut, "GET /settings": settingsPage, "POST /settings": rotate };
}

export function createAdminApp(services: Services, ingestToken: string | undefined) {
  const kit = createAdminKit(services);

  const overview: Handler = (ctx) => {
    const businesses = services.businesses.list();
    const leases = services.market.leases();
    const equipment = services.market.equipment();
    const leads = services.market.leads();
    const count = (n: number, label: string, href: string) =>
      html`<a class="stat" href="${href}"><strong>${n}</strong><span>${label}</span></a>`;
    render(ctx, "Oversikt", html`<h1>Oversikt</h1><div class="stats">
${count(businesses.filter((b) => b.status === "PENDING").length, "bedrifter venter", "/businesses")}
${count(businesses.filter((b) => b.status === "APPROVED").length, "godkjente bedrifter", "/businesses")}
${count(equipment.filter((e) => e.status === "PENDING").length, "maskiner venter", "/equipment")}
${count(leases.filter((l) => l.status === "PENDING").length, "områdeforespørsler", "/territories")}
${count(leases.filter((l) => l.status === "ACTIVE").length, "aktive områder", "/territories")}
${count(leads.filter((l) => !l.assignedBusinessId).length, "leads uten partner", "/leads")}
</div>`);
  };
  const render = kit.render;

  return createApp({
    realm: "admin",
    brand: BRAND,
    cookieName: ADMIN_COOKIE,
    services,
    publicPosts: ["/login"],
    protectGets: true,
    publicGets: ["/login"],
    routes: {
      ...adminAuthRoutes(kit),
      ...adminBusinessRoutes(kit),
      ...adminEquipmentRoutes(kit),
      ...adminTerritoryRoutes(kit),
      ...adminLeadRoutes(kit, ingestToken),
      ...adminCmsRoutes(kit),
      "GET /": overview
    }
  });
}

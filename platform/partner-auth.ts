import { BusinessLoginRequestSchema, BusinessRegisterRequestSchema } from "../src/schemas/platform.ts";
import { startSession, type Handler, type Services } from "./app.ts";
import { ACCOUNT_FIELDS, SECRET_FIELD, SIGN_IN_FIELDS } from "./field-specs.ts";
import { checked, commaList, field, int, list, zodMessage } from "./forms.ts";
import { simpleForm } from "./form-views.ts";
import { html } from "./html.ts";
import { clientIp, redirect, withFlash } from "./http.ts";
import { LoginThrottle } from "./security.ts";
import { profileFields } from "./shared-views.ts";
import type { PartnerRender } from "./partner-app.ts";

export const PARTNER_COOKIE = "bf_partner_session";
const throttle = new LoginThrottle(8, 15 * 60 * 1000);

export function partnerAuthRoutes(services: Services, render: PartnerRender): Record<string, Handler> {
  const session = { realm: "partner" as const, cookieName: PARTNER_COOKIE, services };

  const signInPage: Handler = (ctx) => {
    if (ctx.subjectId) return redirect(ctx.res, "/dashboard");
    const body = html`<section class="card narrow"><h1>Logg inn</h1>${simpleForm("/login", SIGN_IN_FIELDS, "Logg inn")}<p><a href="/register">Ny bedrift? Registrer her</a></p></section>`;
    render(ctx, "Logg inn", body);
  };

  const signIn: Handler = (ctx, form) => {
    if (!form) return;
    const key = clientIp(ctx.req);
    if (throttle.isBlocked(key)) {
      return redirect(ctx.res, withFlash("/login", "err", "For mange forsøk. Vent 15 minutter."));
    }
    const parsed = BusinessLoginRequestSchema.safeParse({ email: field(form, "email"), password: field(form, SECRET_FIELD) });
    const id = parsed.success ? services.businesses.authenticate(parsed.data.email, parsed.data.password) : null;
    if (!id) {
      throttle.recordFailure(key);
      return redirect(ctx.res, withFlash("/login", "err", "Feil e-post eller passord."));
    }
    throttle.reset(key);
    startSession(ctx, session, id, "/dashboard");
  };

  const registerPage: Handler = (ctx) => {
    if (ctx.subjectId) return redirect(ctx.res, "/dashboard");
    const extra = html`${profileFields(null)}`;
    const body = html`<section class="card"><h1>Ny bedriftskonto</h1>${simpleForm("/register", ACCOUNT_FIELDS, "Opprett konto", extra)}</section>`;
    render(ctx, "Ny bedriftskonto", body);
  };

  const register: Handler = (ctx, form) => {
    if (!form) return;
    const parsed = BusinessRegisterRequestSchema.safeParse({
      orgNr: field(form, "orgNr"),
      companyName: field(form, "companyName"),
      contactName: field(form, "contactName"),
      email: field(form, "email"),
      password: field(form, SECRET_FIELD),
      phone: field(form, "publicPhone"),
      depotLocation: field(form, "depotLocation"),
      headline: field(form, "headline"),
      description: field(form, "description"),
      municipalities: list(form, "municipalities"),
      categories: list(form, "categories"),
      certifications: commaList(form, "certifications"),
      zeroEmissionFleet: checked(form, "zeroEmissionFleet"),
      responseSlaMinutes: int(form, "responseSlaMinutes") ?? 30,
      webhookUrl: field(form, "webhookUrl")
    });
    if (!parsed.success) return redirect(ctx.res, withFlash("/register", "err", zodMessage(parsed.error)));
    if (services.businesses.emailOrOrgTaken(parsed.data.email, parsed.data.orgNr)) {
      return redirect(ctx.res, withFlash("/register", "err", "E-post eller organisasjonsnummer er allerede registrert."));
    }
    const status = services.cms.get().autoApproveBusinesses ? "APPROVED" : "PENDING";
    const id = services.businesses.create(parsed.data, status);
    startSession(ctx, session, id, "/dashboard?ok=Konto+opprettet");
  };

  return {
    "GET /login": signInPage,
    "POST /login": signIn,
    "GET /register": registerPage,
    "POST /register": register
  };
}

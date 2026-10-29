import type { IncomingMessage, ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { BusinessRepo } from "./businesses.ts";
import type { Db } from "./db.ts";
import { HttpError, assertSameOrigin, parseCookies, readForm, redirect, sendCss, sendHtml, serializeCookie } from "./http.ts";
import { Marketplace } from "./marketplace.ts";
import { csrfMatches, csrfTokenFor } from "./security.ts";
import { AdminStore, CmsStore, SessionStore, type Realm } from "./stores.ts";
import { html, page } from "./html.ts";

export interface Services {
  readonly db: Db;
  readonly businesses: BusinessRepo;
  readonly sessions: SessionStore;
  readonly admins: AdminStore;
  readonly cms: CmsStore;
  readonly market: Marketplace;
  readonly secureCookies: boolean;
}

export function createServices(db: Db, cmsPublishPath: string, secureCookies: boolean): Services {
  return {
    db,
    businesses: new BusinessRepo(db),
    sessions: new SessionStore(db),
    admins: new AdminStore(db),
    cms: new CmsStore(db, cmsPublishPath),
    market: new Marketplace(db),
    secureCookies
  };
}

const CSS = readFileSync(new URL("./static/platform.css", import.meta.url), "utf8");

export interface RequestContext {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  readonly url: URL;
  readonly flashOk: string | null;
  readonly flashErr: string | null;
  /** Raw session token (undefined when not logged in). */
  readonly token: string | undefined;
  /** Subject id resolved from the session for this realm. */
  readonly subjectId: string | null;
  readonly csrf: string;
}

export type Handler = (ctx: RequestContext, form: URLSearchParams | null) => Promise<void> | void;

export interface AppConfig {
  readonly realm: Realm;
  readonly brand: string;
  readonly cookieName: string;
  readonly services: Services;
  readonly routes: Readonly<Record<string, Handler>>;
  /** Paths that may be posted without a session (login/register). */
  readonly publicPosts: readonly string[];
  /** When true, every GET except `publicGets` redirects to /login without a session. */
  readonly protectGets?: boolean;
  readonly publicGets?: readonly string[];
}

/** Creates a request listener with session resolution, CSRF enforcement and error pages. */
export function createApp(config: AppConfig): (req: IncomingMessage, res: ServerResponse) => void {
  const { services } = config;
  return (req, res) => {
    void (async () => {
      const url = new URL(req.url ?? "/", "http://platform.local");
      try {
        if (req.method === "GET" && url.pathname === "/platform.css") {
          sendCss(res, CSS);
          return;
        }
        const token = parseCookies(req).get(config.cookieName);
        const subjectId = services.sessions.resolve(config.realm, token);
        const ctx: RequestContext = {
          req,
          res,
          url,
          flashOk: url.searchParams.get("ok"),
          flashErr: url.searchParams.get("err"),
          token: subjectId ? token : undefined,
          subjectId,
          csrf: subjectId && token ? csrfTokenFor(token) : ""
        };

        const routeKey = `${req.method ?? "GET"} ${url.pathname}`;
        const handler = config.routes[routeKey];
        if (!handler) {
          if (url.pathname.startsWith("/api/")) throw new HttpError(404, "Not found");
          throw new HttpError(404, "Siden finnes ikke.");
        }

        if (req.method === "POST" && !url.pathname.startsWith("/api/")) {
          assertSameOrigin(req);
          const form = await readForm(req);
          const isPublic = config.publicPosts.includes(url.pathname);
          if (!isPublic) {
            if (!subjectId || !token) {
              redirect(res, "/login");
              return;
            }
            if (!csrfMatches(token, form.get("csrf"))) throw new HttpError(403, "Ugyldig skjema-token. Last siden på nytt.");
          }
          await handler(ctx, form);
          return;
        }
        if (req.method === "GET" && config.protectGets && !subjectId && !(config.publicGets ?? []).includes(url.pathname)) {
          redirect(res, "/login");
          return;
        }
        await handler(ctx, null);
      } catch (error) {
        const status = error instanceof HttpError ? error.status : 500;
        const message = error instanceof HttpError ? error.message : "Uventet feil.";
        if (!(error instanceof HttpError)) console.error(`[platform:${config.realm}]`, error);
        if (res.headersSent) {
          res.end();
          return;
        }
        sendHtml(
          res,
          status,
          page({
            title: `Feil ${status}`,
            brand: config.brand,
            body: html`<section class="card"><h1>Feil ${status}</h1><p>${message}</p><p><a href="/">Tilbake</a></p></section>`
          })
        );
      }
    })();
  };
}

export function startSession(ctx: RequestContext, config: { realm: Realm; cookieName: string; services: Services }, subjectId: string, to: string): void {
  if (ctx.token) config.services.sessions.destroy(ctx.token);
  const token = config.services.sessions.create(config.realm, subjectId);
  redirect(ctx.res, to, {
    "Set-Cookie": serializeCookie(config.cookieName, token, {
      maxAgeSeconds: config.services.sessions.ttlSeconds,
      secure: config.services.secureCookies
    })
  });
}

export function endSession(ctx: RequestContext, config: { cookieName: string; services: Services }, to: string): void {
  if (ctx.token) config.services.sessions.destroy(ctx.token);
  redirect(ctx.res, to, {
    "Set-Cookie": serializeCookie(config.cookieName, "", { maxAgeSeconds: 0, secure: config.services.secureCookies })
  });
}

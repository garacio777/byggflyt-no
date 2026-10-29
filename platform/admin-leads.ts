import { timingSafeEqual } from "node:crypto";
import { AdminLeadActionSchema, LeadStageEnum, StoredLeadRecordSchema, type StoredLeadRecord } from "../src/schemas/platform.ts";
import type { AdminKit } from "./admin-app.ts";
import type { Handler } from "./app.ts";
import { checked, field, zodMessage } from "./forms.ts";
import { checkbox, formatNok, html, selectOptions } from "./html.ts";
import { HttpError, readBody, redirect, sendJson, withFlash } from "./http.ts";
import { statusBadge } from "./shared-views.ts";

const STAGE_OPTIONS = LeadStageEnum.options.map((v) => ({ value: v, label: v }));

/** Best-effort POST of a lead to a partner's own https webhook (5 s timeout). */
async function notifyPartner(url: string, lead: StoredLeadRecord): Promise<boolean> {
  if (!url.startsWith("https://")) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "byggflyt.lead.assigned", lead }),
      signal: AbortSignal.timeout(5000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

function tokenMatches(expected: string, header: string | undefined): boolean {
  const supplied = header?.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function adminLeadRoutes(kit: AdminKit, ingestToken: string | undefined): Record<string, Handler> {
  const { services, render } = kit;

  const listPage: Handler = (ctx) => {
    const csrf = kit.csrf(ctx);
    const partners = services.businesses.list().filter((b) => b.status === "APPROVED");
    const partnerOptions = [{ value: "", label: "Ingen (territoriedesk)" }, ...partners.map((b) => ({ value: b.id, label: b.companyName }))];
    const rows = services.market.leads().map(
      (l) => html`<tr><td>${l.leadReferenceId}<br><span class="muted">${l.createdAt.slice(0, 16)}</span></td>
<td>${l.companyName} (${l.orgNr})<br><span class="muted">${l.contactName} · ${l.phone} · ${l.postalCode}</span></td>
<td>${l.territorySlotKey}<br>${formatNok(l.estimatedContractNokMin)}–${formatNok(l.estimatedContractNokMax)}</td>
<td>${statusBadge(l.leadStage)}<br><span class="muted">${l.assignedBusinessName ?? "Ikke tildelt"}</span></td>
<td><form method="post" action="/leads" class="row">${csrf}<input type="hidden" name="action" value="ASSIGN_PARTNER">
<input type="hidden" name="leadReferenceId" value="${l.leadReferenceId}">
<select name="businessId">${selectOptions(partnerOptions, l.assignedBusinessId ?? "")}</select>
${checkbox("triggerWebhook", "on", "Varsle", false)}<button type="submit">Tildel</button></form>
<form method="post" action="/leads" class="row">${csrf}<input type="hidden" name="action" value="UPDATE_STAGE">
<input type="hidden" name="leadReferenceId" value="${l.leadReferenceId}">
<select name="leadStage">${selectOptions(STAGE_OPTIONS, l.leadStage)}</select>
<input name="partnerNotes" maxlength="500" value="${l.partnerNotes}"><button type="submit">Lagre</button></form>
<form method="post" action="/leads" class="inline">${csrf}<input type="hidden" name="action" value="DELETE">
<input type="hidden" name="leadReferenceId" value="${l.leadReferenceId}"><button class="danger" type="submit">Slett</button></form></td></tr>`
    );
    const table = rows.length
      ? html`<table><thead><tr><th>Ref</th><th>Kunde</th><th>Område</th><th>Status</th><th>Handling</th></tr></thead><tbody>${rows}</tbody></table>`
      : html`<p class="muted">Ingen leads ennå. Send leads til <code>POST /api/leads/ingest</code> med Bearer-token (PLATFORM_INGEST_TOKEN).</p>`;
    render(ctx, "Leads", html`<h1>Leads</h1><section class="card">${table}</section>`);
  };

  const act: Handler = async (ctx, form) => {
    if (!form) return;
    const action = field(form, "action");
    const leadReferenceId = field(form, "leadReferenceId");
    const input =
      action === "ASSIGN_PARTNER"
        ? { action, leadReferenceId, businessId: field(form, "businessId") || null, triggerWebhook: checked(form, "triggerWebhook") }
        : action === "UPDATE_STAGE"
          ? { action, leadReferenceId, leadStage: field(form, "leadStage"), partnerNotes: field(form, "partnerNotes") }
          : { action, leadReferenceId };
    const parsed = AdminLeadActionSchema.safeParse(input);
    if (!parsed.success) return redirect(ctx.res, withFlash("/leads", "err", zodMessage(parsed.error)));
    const a = parsed.data;

    if (a.action === "DELETE") {
      services.market.deleteLead(a.leadReferenceId);
      return redirect(ctx.res, withFlash("/leads", "ok", "Lead slettet."));
    }
    if (a.action === "UPDATE_STAGE") {
      const ok = services.market.updateLeadStage(a.leadReferenceId, a.leadStage, a.partnerNotes, null);
      return redirect(ctx.res, withFlash("/leads", ok ? "ok" : "err", ok ? "Lead oppdatert." : "Fant ikke lead."));
    }
    const lead = services.market.findLead(a.leadReferenceId);
    if (!lead) return redirect(ctx.res, withFlash("/leads", "err", "Fant ikke lead."));
    const biz = a.businessId ? services.businesses.find(a.businessId) : null;
    if (a.businessId && (!biz || biz.status !== "APPROVED")) return redirect(ctx.res, withFlash("/leads", "err", "Bedriften må være godkjent."));
    const updated: StoredLeadRecord = {
      ...lead,
      assignedBusinessId: biz?.id ?? null,
      assignedBusinessName: biz?.companyName ?? null,
      routingStatus: biz ? "ROUTED_EXCLUSIVE_PARTNER" : "QUEUED_TERRITORY_DESK"
    };
    services.market.saveLead(updated);
    let note = biz ? `Tildelt ${biz.companyName}.` : "Flyttet til territoriedesk.";
    if (biz && a.triggerWebhook) {
      note += (await notifyPartner(biz.webhookUrl, updated)) ? " Webhook levert." : " Webhook feilet eller mangler.";
    }
    redirect(ctx.res, withFlash("/leads", "ok", note));
  };

  /** Machine-to-machine lead intake. Disabled unless PLATFORM_INGEST_TOKEN is set. */
  const ingest: Handler = async (ctx) => {
    if (!ingestToken || ingestToken.length < 24) throw new HttpError(404, "Not found");
    if (!tokenMatches(ingestToken, ctx.req.headers.authorization)) throw new HttpError(401, "Unauthorized");
    let payload: unknown;
    try {
      payload = JSON.parse(await readBody(ctx.req));
    } catch {
      return sendJson(ctx.res, 400, { ok: false, error: "Invalid JSON" });
    }
    const parsed = StoredLeadRecordSchema.safeParse(payload);
    if (!parsed.success) return sendJson(ctx.res, 422, { ok: false, error: zodMessage(parsed.error) });
    let lead = parsed.data;
    if (!lead.assignedBusinessId && services.cms.get().autoRouteLeadsToExclusivePartner) {
      const holderId = services.market.activeLeaseHolder(lead.territorySlotKey);
      const holder = holderId ? services.businesses.find(holderId) : null;
      if (holder && holder.status === "APPROVED") {
        lead = { ...lead, assignedBusinessId: holder.id, assignedBusinessName: holder.companyName, routingStatus: "ROUTED_EXCLUSIVE_PARTNER" };
      }
    }
    services.market.saveLead(lead);
    sendJson(ctx.res, 201, { ok: true, leadReferenceId: lead.leadReferenceId, assignedBusinessId: lead.assignedBusinessId });
  };

  return { "GET /leads": listPage, "POST /leads": act, "POST /api/leads/ingest": ingest };
}

import { html, type SafeHtml } from "./html.ts";

/** Admin navigation links (label, path). */
export const ADMIN_LINKS: readonly (readonly [string, string])[] = [
  ["Oversikt", "/"],
  ["Bedrifter", "/businesses"],
  ["Maskiner", "/equipment"],
  ["Områder", "/territories"],
  ["Leads", "/leads"],
  ["Innhold", "/cms"],
  ["Innstillinger", "/settings"]
];

export function linkList(links: readonly (readonly [string, string])[]): SafeHtml {
  return html`${links.map(([label, href]) => html`<a href="${href}">${label}</a>`)}`;
}

import type { APIRoute } from "astro";
import { CATEGORIES } from "../data/categories.js";
import { MUNICIPALITIES } from "../data/municipalities.js";

export const GET: APIRoute = () => {
  const siteOrigin = "https://byggflyt-no.vercel.app";
  const lastmod = "2026-10-28";

  const paths: string[] = [
    "/",
    "/kalkulator/",
    "/bli-partner/",
    ...CATEGORIES.map((c) => `/kategorier/${c.slug}/`),
    ...MUNICIPALITIES.map((m) => `/omrader/${m.slug}/`),
    ...MUNICIPALITIES.flatMap((m) => CATEGORIES.map((c) => `/utleie/${m.slug}/${c.slug}/`))
  ];

  const urlEntries = paths
    .map(
      (p) =>
        `  <url>\n    <loc>${siteOrigin}${p}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
};

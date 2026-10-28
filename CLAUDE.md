# AI Coding Contract & Architecture Guardrails (ByggFlyt.no)

You are operating inside a strict Specs-First repository. Every rule below is enforced by an automated CI gate in `.github/workflows/ci-gate.yml`. Violating any rule will fail the build.

## 1. Architecture Boundaries
- **Static Edge Default:** Keep Astro configured as `output: 'static'`. All programmatic Rank-and-Rent directory routes (`src/pages/utleie/[kommune]/[kategori].astro`, `src/pages/omrader/[kommune].astro`, `src/pages/kategorier/[kategori].astro`) must pre-render at build time via `getStaticPaths()`.
- **Dynamic Isolation:** All external lookups (`data.brreg.no`), B2B lead routing, and partner territory applications must live exclusively inside `functions/` as stateless Edge Workers (`api/` contains only thin Vercel Edge pass-through adapters).
- **Zero External Browser Leaks:** Keep `connect-src 'self'` intact. Never load external fonts, analytics trackers, or third-party scripts in browser templates.

## 2. Type & Schema Discipline (Enforced by `tsc --noEmit`)
- Never use `any`, `@ts-ignore`, or `@ts-expect-error`.
- Every API input, external Enhetsregisteret response, and API output MUST be validated through a Zod `.safeParse()` schema imported from `src/schemas/` before accessing properties.

## 3. Security & Supply Chain (Enforced by Semgrep, Gitleaks & npm ci)
- Never use `innerHTML`, `dangerouslySetInnerHTML`, `set:html`, or `eval()`. Use DOM `createElement`/`textContent` and HTML5 Schema.org microdata (`itemscope`, `itemtype`, `itemprop`).
- Never use inline `style="..."` attributes; toggle CSS classes or the HTML `hidden` attribute so `style-src 'self'` is strictly satisfied.
- Never hardcode secrets; read webhook URLs or API keys exclusively from runtime `env`.
- CI enforces `npm ci --ignore-scripts`.

## 4. Forensic DOM, SEO & Header Parity (Enforced by CI Artifact Gate)
- Production builds must never emit `.map` source maps or framework footprint strings (`"generator"` — always use Norwegian `"strømaggregat"` or `"aggregat"` in domain copy).
- `public/_headers` and `vercel.json` must maintain 1:1 parity across all hardened HTTP security headers.
- Every HTML page under `dist/` must include a self-referencing `<link rel="canonical">`, semantic `<main>` landmark, and `dist/404.html` + `dist/sitemap.xml` must exist.

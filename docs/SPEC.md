# System Specification: ByggFlyt.no — Unified Norwegian Bygg & Anlegg Rank-and-Rent Directory

## 1. Objective
Operate a high-intent B2B **Utility-Led Rank-and-Rent Directory** for the Norwegian construction industry (*bygge- og anleggsbransjen*) across the **Østlandet corridor** (`Oslo`, `Bærum & Asker`, `Ås & Nordre Follo`, `Lillestrøm & Lørenskog`, `Ullensaker & Gardermoen`, `Moss & Vestby`, `Indre Østfold`, `Sarpsborg`, `Fredrikstad`, `Drammen & Lier`).

Instead of thin affiliate content or multi-caller lead spam, ByggFlyt combines:
1. **Programmatic Local SEO Matrix (`68+` static routes):** `10` regional hubs × `5` core B2B construction verticals (`Maskinutleie & Graving`, `Lift, Personløfter & Stillas`, `Vinterbygg: Teletining & Byggvarme`, `Byggestrøm & Utslippsfri Rigg`, `Container, Kranbil & Masse`).
2. **Deterministic Field Engineering Calculators (`06:45 Brakkerigg Utilities`):** Pure client-side calculators solving marktrykk/lift sizing, frost-thaw `kW` + mat sizing, `63A` vs. mobile battery (`BESS`) peak-load & Arbeidstilsynet crew-cabin sizing, and TEK17 § 9-6 `≥70%` waste-sorting + fastmasse/løsmasse tonnage math.
3. **Brønnøysundregistrene (`data.brreg.no`) + Mod-11 B2B Verification Gate:** Filters out private tire-kickers by validating Norwegian 9-digit `organisasjonsnummer` (Modulus-11 checksum + live Enhetsregisteret lookup for active AS, MVA status, and NACE code).
4. **Exclusive Territory Routing Engine (Rank & Rent):** Routes EHF-ready, pre-calculated equipment/rigg orders exclusively to one leased regional partner per `[Kommune × Kategori]` slot—or captures verified leads into the unclaimed pool while offering local suppliers exclusive territory leasing (`/bli-partner`).

## 2. 4-Zone Assume Breach Architecture
1. **Zone 1 — Pre-Rendered Static Edge (`src/pages/`):** Astro (`output: 'static'`) compiles all directory, regional hub, category pillar, calculator, partner, and XML sitemap routes at build time with zero server runtime and strict CSP (`script-src 'self'; style-src 'self'; connect-src 'self'`).
2. **Zone 2 — Private Partner CRM / Webhook Vault:** Exclusive partner contracts, territory lease billing, and webhook endpoints live off-public behind environment secrets (`PARTNER_WEBHOOK_URL`).
3. **Zone 3 — Ephemeral Build & Forensic Sanitization Gate (`.github/workflows/ci-gate.yml`):** Enforces `npm ci --ignore-scripts`, `tsc --noEmit`, Gitleaks secret scanning, Semgrep SAST, zero `.map` files, zero framework footprint leaks, recursive canonical/landmark checks across all `dist/**/*.html` files, and 1:1 security header parity between `public/_headers` and `vercel.json`.
4. **Zone 4 — Stateless Edge Micro-Perimeter (`functions/api/` + `api/`):**
   - `GET /api/verify-org`: Validates 9-digit `org.nr` via Mod-11 and proxies `data.brreg.no` Enhetsregisteret responses through strict Zod schemas so browser `connect-src 'self'` remains sealed.
   - `POST /api/submit-lead`: Validates contractor B2B dispatch requests + calculator snapshots, computes deterministic NOK deal-value brackets & compliance notes, and routes to the leased territory partner or unclaimed lead pool.
   - `POST /api/partner-inquiry`: Validates supplier applications to rent exclusive `[Kommune × Kategori]` territory slots.

## 3. Failure Modes & Mitigations
- **Doorway-Page SEO Penalty:** Mitigated by embedding genuine municipal engineering parameters (design winter temperature, frost-free depth, soil/clay bearing profile, municipal zero-emission policy, logistics corridors, and flatbed mobilization range) plus interactive vertical-specific calculators on every `[kommune]/[kategori]` page.
- **Unqualified Consumer Noise:** Mitigated by Mod-11 `org.nr` validation and Enhetsregisteret B2B company lookup prior to dispatch routing.
- **CSP / Header Drift Across Hosts:** Mitigated by automated CI parity assertions across `public/_headers` (Cloudflare Pages) and `vercel.json` (Vercel Edge).

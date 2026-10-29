# ByggFlyt.no — Unified Norwegian Bygg & Anlegg Rank-and-Rent Directory

Specs-First, utility-led B2B Rank-and-Rent directory for the Norwegian construction industry (*bygge- og anleggsbransjen*) across the **Østlandet corridor**.

## Core Capabilities
- **68 Pre-Rendered Static SEO Routes (`output: 'static'`):**
  - `50` Hyper-local `[Kommune × Kategori]` Rank-and-Rent landing pages (`/utleie/[kommune]/[kategori]/`)
  - `10` Regional engineering hubs (`/omrader/[kommune]/`) with real frost depth, design winter temp, soil/clay profile, zero-emission tender policy, and flatbed transfer costs
  - `5` Vertical pillar pages (`/kategorier/[kategori]/`)
  - Dedicated `06:45 Brakkerigg` mobile calculator hub (`/kalkulator/`) + Exclusive Partner Territory Lease portal (`/bli-partner/`) + `/sitemap.xml`
- **5 Deterministic Norwegian Field Calculators (`src/lib/calculators.ts`):**
  1. Gravemaskin- & Komprimerings-velger
  2. Lift-, Stillas- & Marktrykk-velger (+ HMS)
  3. Teletining- & Byggvarme-kalkulator (`kW` + matter + tinetid)
  4. Utslippsfri Byggestrøm (`32A/63A/125A`) & Mobil Batteribank (`BESS`) + Dag-1 Brakkerigg
  5. Masseberegner (`fm³ → lm³` / tonnasje) & TEK17 § 9-6 `≥70%` Avfallscontainer-velger
- **Stateless Zone 4 Edge Verification & Lead Routing (`functions/api/` + `api/`):**
  - `GET /api/verify-org?orgnr=...` — Modulus-11 checksum + live Brønnøysundregistrene (`data.brreg.no`) B2B lookup
  - `POST /api/submit-lead` — Zod-validated contractor lead dispatch + NOK contract bracket estimation
  - `POST /api/partner-inquiry` — 48h territory exclusivity reservation for local rental & contracting partners

## Commands
```bash
npm ci --ignore-scripts
npm run typecheck
npm run build
npm run preview
```

## Platform Control Plane (`platform/`) — Business Dashboards & Admin Console
Self-hosted Node 22 service with **zero extra runtime dependencies** (built-in `node:sqlite`, `node:http`, `node:crypto`/scrypt). The public site stays a static Astro build.

| Server | Default URL | Who |
|---|---|---|
| Business portal | `http://127.0.0.1:4323` | Businesses register (org.nr Modulus-11), log in, edit their profile, list equipment, request exclusive territories, work their leads |
| Admin console | `http://127.0.0.1:4322` (localhost only) | Owner approves/suspends businesses, moderates equipment, prices/assigns territories, routes leads, edits site copy & SKU prices |

```bash
npm run platform          # starts both servers; first run prints a one-time admin access code
```

- **Tenant isolation:** every business query is scoped to the logged-in business id; partner and admin sessions live in separate realms/cookies.
- **Security:** HttpOnly + SameSite=Strict session cookies (server-side, hashed), per-session CSRF tokens, Origin checks, login throttling, scrypt hashing, Zod `.safeParse()` on every input and stored row, no scripts / inline styles (CSP `default-src 'none'`).
- **Publishing:** Admin → *Innhold* → *Publiser* writes `src/data/cms-overrides.json`; commit + push to rebuild the static site with new copy, prices and slot status.
- **Lead intake:** `POST /api/leads/ingest` on the admin port with `Authorization: Bearer $PLATFORM_INGEST_TOKEN` (body = `StoredLeadRecordSchema`). Leads auto-route to the active exclusive partner when enabled.
- **Data:** SQLite at `data/platform.db` (git-ignored). Back it up.
- To expose the business portal publicly, set `PARTNER_HOST=0.0.0.0`, put it behind HTTPS (reverse proxy) and set `PLATFORM_SECURE_COOKIES=1`. Keep the admin console on localhost/VPN.

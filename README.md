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

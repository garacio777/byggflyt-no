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
- **Frictionless Public B2B Lead & Partner Onboarding (`api/` + `functions/`):**
  - **Public Partner Onboarding (`/bli-partner/` → `POST /api/partner-inquiry`):** Rental companies pick an exclusive `[Kommune × Fagområde]` zone directly on the live site (or via 1-click prefill from any local page), auto-verify their 9-digit org.nr via live Brønnøysundregistrene (`GET /api/verify-org`), and lock a 48-hour territory reservation — **zero passwords or separate portal logins required**.
  - **Contractor B2B Dispatch (`POST /api/submit-lead`):** Zod-validated B2B order specs + NOK contract bracket estimation.
  - **Direct Mailbox ESMTP (`functions/lib/smtp-node.ts`):** Zero-dependency `STARTTLS` submission (`smtp.protonmail.ch:587` or Domeneshop) straight to `BOOKING_NOTIFY_EMAIL` with `Reply-To` set to the applicant, guarded by an all-or-nothing `SMTP_USER` + `SMTP_PASSWORD` + `BOOKING_NOTIFY_EMAIL` check.

## Commands
```bash
npm ci --ignore-scripts
npm run typecheck
npm run build
npm run email:test              # sends live verification email via Direct Mailbox SMTP
npm run email:test -- --auth-only
npm run preview
```

## Optional Local Admin / CMS Tool (`platform/`)
Self-hosted local Node 22 tool (`npm run platform` on `127.0.0.1:4322` / `4323`) for offline CMS overrides (`src/data/cms-overrides.json`). Not required in production — live partner reservations and contractor leads flow directly through `/bli-partner/` and `/api/*` via Direct Mailbox SMTP.

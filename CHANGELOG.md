# Changelog

All notable changes to Ancy Expense Tracker. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

Each release captures:
- **Shipped** — what's now live
- **The user problem each change solves** (one-liner)
- **Not shipping yet** — what was scoped out and why (the discipline of saying no)

---

## [Unreleased]

### Shipped
_Work in progress for next release._

### Not shipping yet
- Loan/liability tracking — needs schema design first (see ADR-pending)
- Recurring budget templates — depends on per-month income storage
- iOS/Android via Capacitor — distribution change, not a feature; deferred until web v2 stable

---

## [2.3.0] — 2026-04-27

### Shipped
- **AI Insights redesign** — split into Anomalies and Personality tabs, returns structured JSON instead of a single text blob.  
  → solves: "AI insights are interesting but not actionable; I can't tell what to act on first."
- **Date-driven expense routing** — expenses now save to the month their date belongs to, not the currently-viewed month.  
  → solves: "I added an expense for today while viewing last month, and it disappeared from this month's view." (See ADR-003.)
- **Custom date range view fix** — custom ranges now correctly load from all overlapping month docs.  
  → solves: "My custom range view shows no data even though I have expenses in that range."

### Fixed
- Silent JSON parse failure in `getSpendingInsights` Cloud Function — empty `catch {}` was swallowing all parse errors. Now logs raw response and parse errors. (See ADR-002 for related model decision.)
- Frontend was reading insights from the wrong response path (`data.result.insights` instead of `data.insights`).

### Not shipping yet
- Spending Trends timeframe toggle (week/month/year) — low value vs effort. Adding income line instead, which gives 10x more signal in same UI space.
- Multi-currency historical conversion — current-rate display only for v1.

---

## [2.2.0] — 2026-04-XX

### Shipped
- **Bank statement PDF/CSV import** with AI parsing via `parseBankStatement` Cloud Function.  
  → solves: "I have to manually re-enter every transaction from my bank statement."
- **INR as location-based default currency** — detects `Asia/Kolkata` timezone.  
  → solves: "App defaults to USD, I'm Indian and have to change every amount in my head."
- Server-side Anthropic API calls — no client-side key exposure.

### Fixed
- Wrong model name in `parseBankStatement` causing 500 INTERNAL errors.

### Not shipping yet
- Currency picker in onboarding — pushed to v2.4 (timezone detection covers most users for now).
- Auto-categorization confidence scores — needs more parse-accuracy data first.

---

## [2.1.0] — 2026-XX-XX

### Shipped
- Spending Trends area chart (Recharts, last 6 months)
- Recurring expense modal
- AI quick-add: type "500 on groceries, 200 on coffee" → parsed into structured expenses
- Category management with custom colors
- CSV export

---

## [2.0.0] — 2026-XX-XX

### Shipped
- Initial v2 release
- Google Sign-In auth
- Expense CRUD
- Budget tracking per category
- Income source tracking
- Savings goals
- Dark mode first design
- Firestore-backed persistence

---

## Versioning notes
- **Major** (X.0.0) — schema changes, breaking UX shifts
- **Minor** (2.X.0) — new features, no breaking changes
- **Patch** (2.3.X) — bug fixes only

## See also
- [`docs/decisions/`](./docs/decisions/) — reasoning behind major changes
- [`README.md`](./README.md) — project overview

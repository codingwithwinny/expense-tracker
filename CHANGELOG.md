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

## [2.4.0] — 2026-05-13

### Shipped

- **Global error boundary** catches unhandled React errors with a friendly recovery UI instead of a white page of death.
  → solves: "The app froze and I have no idea what happened or what to do."
- **Firestore offline-first writes** with IndexedDB-backed persistence. Expenses added while offline queue locally and sync automatically on reconnect. Amber offline banner, per-expense sync indicators, and reconnection toast confirm state at all times.
  → solves: "I added an expense on the metro and it was gone when I got home."
- **All Firestore writes and Cloud Function calls wrapped in try/catch** with user-friendly error toasts.
  → solves: "I clicked save and nothing happened. Did it work?"
- **AI features refuse cleanly when offline** instead of spinning forever.
  → solves: "AI Insights just hung and I didn't know if it was working."
- **AI features timeout gracefully at 30s** with status update at 10s and a retry option.
  → solves: "The AI is spinning forever and I can't tell if it's broken or slow."
- **Bank statement imports validate file size (<10MB) and type (PDF/CSV only) before upload.**
  → solves: "I uploaded a screenshot and the app just hung."
- **Expense form preserves data on save failure** — modal stays open, data intact, inline error shown.
  → solves: "Save failed and I lost everything I just entered."

### Discovered during testing

- Firestore optimistic writes showed false "Expense added!" toasts while offline. Caught during manual network-offline test. Fixed as part of this release with proper offline persistence rather than a band-aid navigator.onLine check.

### Not shipping yet

- Loan/liability tracking — needs schema design first
- Recurring budget templates — depends on per-month income storage
- iOS/Android via Capacitor — deferred until web v2 stable
- Visual redesign (Warm tokens, dashboard layout) — paused per ADR-005 retrospective

## [2.5.0] — 2026-05-14

### Added — Blocker #2: AI cost controls (ADR-005)

- Daily per-user limits on Claude-powered features: 3 insights, 10 quick-add parses, 3 bank statement imports
- Server-side enforcement in Cloud Functions — counter incremented atomically before each Claude call, throws `resource-exhausted` HttpsError if over limit
- Per-call cost tracking (input + output tokens × Sonnet 4.5 rates) stored in Firestore at `users/{uid}/usage/{YYYY-MM-DD}` and aggregated monthly at `users/{uid}/usageMonthly/{YYYY-MM}`
- Limit-reached modal: email-only waitlist capture, "Or come back tomorrow" dismiss, time-until-midnight UTC countdown
- Quota indicators in UI: "AI Insights · 2/3 today", "{remaining} quick-adds left today"
- Dev-only usage panel in Settings showing today's calls + spend
- Waitlist collection at `/waitlist/{autoId}` with email + source + userId + createdAt

### Security

- Firestore rules: `/usage` and `/usageMonthly` are read-only for the user (writes only by Cloud Functions via Admin SDK)
- `/waitlist` allows create by authenticated user matching `userId`, no read/update/delete

## [2.6.0] — 2026-05-14

### Added — Blocker #3: Empty states (ADR-005)

- Reusable `EmptyState` component with icon, heading, subtext, primary CTA, and optional secondary link
- Dashboard, Expenses list, Budgets, AI Insights, and custom-date-range empty states
- Distinguishes brand-new-user empty state from filtered-empty state (different copy, different CTAs)
- Budgets framed as optional ("Ancy works without them") — quiet trust signal
- No multi-step onboarding flow — first Add Expense IS the onboarding moment

## [2.7.0] — 2026-05-14

### Added — Blocker #4: Data export (ADR-005)

- Export all expense data as CSV (Excel/Sheets/Numbers compatible)
- Export full backup as JSON (expenses + budgets + income sources + savings goals + categories)
- Settings → Your data section, positioned above Danger Zone
- RFC 4180-compliant CSV escaping (commas, quotes, newlines in notes handled correctly)
- Disabled state for users with zero expenses ("Add some expenses first")
- Pure client-side — no Cloud Function calls, works offline

### Fixed

- React hook rules violation in ExpenseTracker where new `totalExpenseCount` useMemo was placed after early return — moved to top hooks block (caught by error boundary from Blocker #1)

## [2.8.0] — 2026-05-14

### Added — Blocker #5: Offline polish (ADR-005)

- New "Works offline" section in Settings showing exactly which features are available offline, sync queued, or need connection
- Sync indicator tooltips on offline-pending expenses ("Waiting to sync — will upload when you're back online")

### Changed

- Offline banner: toned down from amber-warning to neutral-informational. Reads "You're offline. Changes will sync when you reconnect." with a cloud icon. Less alarming, more trustworthy.

### Note

- Reload-while-offline works only on production builds, not Vite dev server (expected behavior — dev server requires live websocket connection)

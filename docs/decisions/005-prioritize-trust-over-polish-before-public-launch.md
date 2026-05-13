# ADR-005: Prioritize Trust & Reliability Over Visual Polish Before Public Launch

**Status:** Accepted
**Date:** 2026-05-13
**Deciders:** Winston Dsilva

## Context

Ancy has reached a point where the core product loop works end-to-end:
expense CRUD, AI-powered insights, bank statement import, savings goals,
budgets, multi-currency, PWA install, dark/light theming. A v2-development
branch is running a visual redesign toward a "Warm minimal" aesthetic
inspired by Headspace and Monarch Money.

The temptation is to keep pushing visual polish until the app _looks_
ready to ship publicly. After honest review, the visual layer is roughly
80-95% there. The functional and trust layers are not.

Five blockers stand between "working demo" and "trustworthy product
strangers will use for their money":

1. **No visible error handling.** Firestore failures, AI Cloud Function
   timeouts, malformed CSV imports — all fail silently or freeze the UI.
2. **No offline support beyond the PWA shell.** Every interaction
   requires connectivity.
3. **No data export / portability.** CSV export exists but no full JSON
   dump or "download all my data" — GDPR-required in EU, trust-building
   everywhere.
4. **No empty states.** First-time users land on a blank dashboard after
   onboarding with no guidance.
5. **No AI cost controls.** No rate limiting, no per-user quotas, no
   cost monitoring. At 1,000 users this becomes a $300-600/month
   liability.

Mobile is the sixth gap: current mobile is responsive-desktop, not a
first-class mobile experience. No swipe gestures, no haptics, no
keyboard handling, no full-screen Add Expense sheet, no install prompt
strategy.

## Decision

**Freeze design investment after a minimal Warm tokens pass. Redirect
the next ~3 weeks of work to trust, reliability, and dedicated mobile
views. Resume design polish only after the product is shippable to
strangers without embarrassment.**

Concrete sequence:

| Phase | Duration | Scope                                                               |
| ----- | -------- | ------------------------------------------------------------------- |
| 1     | 1 day    | Apply Warm color tokens + Geist typography only. No layout changes. |
| 2     | 2 weeks  | Fix the 5 functional blockers above.                                |
| 3     | 1 week   | Dedicated mobile views for Dashboard, Add Expense, Insights.        |
| 4     | 1 week   | Phase 2 of Warm redesign (dashboard layout).                        |
| 5     | —        | Soft launch to 10-20 users. Iterate based on real usage.            |

Other tabs (Expenses, Budgets, Goals, Settings) stay at current B+
design quality. Disproportionate design effort goes to Dashboard and
Insights — the two surfaces where Ancy's AI-first positioning lives.

## Rationale

- **Personal finance lives on trust.** A beautiful app that loses a
  user's data once is dead. A plain app that never loses data and
  handles errors gracefully earns retention. The current order of
  investment is backwards for the category.
- **Visual polish has diminishing returns past 80%.** Going from B+ to
  A+ design takes as much effort as fixing all five blockers combined.
  The marginal user does not care about the difference between "nice"
  and "stunning" if the app crashes on their first import.
- **Portfolio value is higher for shipped reliability than for shipped
  aesthetics.** "Built a working, trustworthy AI finance PWA used by
  real people" is a stronger AI PM story than "built a beautiful demo
  that never reached real users." The decision-making artifact (this
  ADR) is itself part of that story.
- **AI cost exposure is non-trivial.** At current per-call costs and
  zero rate limiting, a single curious user refreshing insights can run
  up real bills. Shipping publicly without a freemium gate is a
  financial risk, not just a product risk.
- **Mobile responsive ≠ mobile native-feeling.** Linear, Notion,
  Things, and Headspace all maintain separate mobile component trees
  for a reason. Ancy is a daily-use PWA where mobile is the primary
  surface; treating it as a smaller desktop is a strategic error.

## Consequences

### Positive

- Public launch becomes credible in ~6 weeks rather than indefinitely
  drifting.
- Each blocker fix produces a journal entry and potentially a LinkedIn
  post — sustained "building in public" content rooted in real shipped
  work.
- AI cost stays bounded; freemium gating is built before the bills hit.
- Mobile users get a product designed for them, not a desktop crammed
  into a phone.

### Negative

- Warm redesign ships in two passes (tokens now, layout later) instead
  of one — slightly more friction.
- Visual polish gap between Dashboard/Insights and other tabs is a
  deliberate choice that may feel uneven to some users.
- Foregoes the satisfaction of "the redesign is done" in favor of less
  glamorous reliability work.

### Neutral

- Mobile views as a separate component tree means more code to maintain
  long-term. Acceptable cost for the UX gain.
- The "Savings" → "Goals" rename from the Warm design is deferred to
  Phase 4 rather than landing immediately.

## Alternatives Considered

**Push through full Warm redesign first, fix blockers after.**
Rejected. Lands a beautiful app that strangers cannot safely use. Wrong
order for a finance product. Risks shipping publicly anyway under
sunk-cost pressure once the visuals are done.

**Skip Warm entirely, fix blockers and ship current design.**
Rejected. Current design is acceptable but does not match Ancy's brand
voice or AI-first positioning. The 1-day tokens pass is cheap enough to
include without delaying the reliability work meaningfully.

**Ship now, fix blockers based on user complaints.**
Rejected. Real users losing real expense data to bugs is not a
recoverable reputation hit for a personal finance app. The blockers are
predictable enough to fix in advance.

## Related

- ADR-001: Dark mode first
- ADR-002: Claude Sonnet for AI features
- ADR-003: Date-driven expense routing
- ADR-004: Disposable money model
- CHANGELOG.md: track each blocker fix as a discrete release

## Notes

The five-blocker list and 6-week sequence will likely shift in detail
as work happens. The principle — trust before polish, with one
restrained visual upgrade landing immediately — is the durable part of
this decision.

## Retrospective: 2026-05-13

Phase 1 implementation revealed an incorrect assumption. The app uses two
parallel styling systems — Tailwind utility classes (the majority) and a
CSS custom property layer (small subset). Retargeting only the CSS
variables changed appearance for ~5% of surfaces; the Tailwind-classed
majority continued reading from hardcoded color values like #06080F and
white/[0.035].

A true Warm tokens pass requires either:
(a) replacing hardcoded dark: classes throughout App.jsx, or
(b) a global CSS override fighting Tailwind specificity (fragile).

Both are larger than the "1 day" estimate in the original ADR. Rather
than over-invest in visuals before functional blockers are addressed,
**all visual work is deferred until after Phase 2 (blockers) ships**.
Phase 1 is removed from the sequence; Phase 4 (full Warm redesign) will
include both layout and tokens in a single coherent pass when the
dashboard is being rebuilt anyway.

This change strengthens the core principle of ADR-005 rather than
weakening it: when reality disagreed with the plan, trust/reliability
work won over visual investment.

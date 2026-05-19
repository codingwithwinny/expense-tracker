# ADR-006: Currency is an account property, not a runtime preference

**Status:** Decided
**Date:** 2026-05-20
**Decided by:** Winston Dsilva

## Context

The app shipped with a currency selector in the dashboard header that allowed users to switch between currencies (INR, USD, EUR, THB, CNY, etc.) at runtime. The selector visually changed the currency symbol shown next to all amounts, but did NOT convert the underlying numeric values.

This created a misleading user experience: switching from INR to THB would change "₹50,000" to "฿50,000" — but in reality 50,000 INR and 50,000 THB are not equivalent (roughly $600 vs $1,500 USD).

A user could:
- Set their currency to THB
- Log ฿500 for dinner believing they're tracking 500 baht
- Switch back to INR and see their dinner cost ₹500 — a different real-world value

This behavior was discovered post-launch on 2026-05-20 during mobile testing.

## Decision

**Currency in Ancy is treated as an account-level property, not a runtime preference.**

- Users select their display currency once, during onboarding or in Settings
- All amounts (income, expenses, budgets, savings goals) are stored and displayed in this single currency
- The currency selector is removed from the dashboard header
- Currency change happens only in Settings, with an explicit confirmation modal explaining no conversion occurs
- Historical data is NOT retroactively converted when currency is changed — users are clearly warned of this

## Rationale

### Why not Model 1 (display-only currency switching)
This was the shipped behavior. It actively misleads users about what their numbers mean — a fundamental trust violation for a personal finance app. Inconsistent with ADR-005's premise.

### Why not Model 3 (multi-currency with live conversion)
This is what serious finance apps (Splitwise, Revolut, Wise) do. It requires:
- Integration with an exchange rate API
- Storing both original and converted amounts per transaction
- UI changes to surface both values
- Decisions on rate-at-time-of-transaction vs. live rates
- Handling offline gracefully with cached rates
- Updates to exports, budgets, and AI insights

This is a meaningful feature build (estimated 2-3 days) that serves a use case (multi-currency users, travelers, expats) that represents an estimated 5-10% of the current user base. Building this now would delay shipping the correct default behavior and would add cognitive overhead for the 90% of users who only use one currency.

### Why Model 2 is the right default
- Mirrors what 90% of personal finance apps do (Mint, YNAB historical, simple Splitwise usage)
- Eliminates the deception of Model 1
- Defers the complexity of Model 3 until user evidence justifies it
- Treats currency as the fundamental account property it actually is
- Honest about what the app does

## Consequences

### Positive
- Users cannot accidentally mislead themselves about their financial data
- Simpler mental model for the user
- Simpler implementation and maintenance
- Sets up a clean migration path to Model 3 if/when needed

### Negative
- Users with multi-currency needs (travelers, expats, freelancers paid in foreign currencies) will need to manually convert before logging — or wait for future multi-currency support
- Removing the dropdown from the header is a visible change for existing users
- The mobile dropdown overflow bug being fixed forces this conversation now

### Neutral
- Currency selector still exists in Settings, just with clearer framing and behavior

## Alternatives considered

| Model | What it does | Status |
|---|---|---|
| Model 1 — Display-only switching | Symbol changes, value stays | Rejected — actively deceptive |
| Model 2 — Account-level currency | Single currency per user, no conversion | **Chosen** |
| Model 3 — Multi-currency with conversion | Per-transaction currency + live conversion | Deferred to future |

## Migration path to Model 3 (future, not now)

When user evidence justifies Model 3:
1. Add \`originalCurrency\` and \`originalAmount\` fields to expense schema
2. Backfill existing expenses with the user's current account currency as \`originalCurrency\`
3. Integrate exchange rate API (recommended: Frankfurter for free tier, Open Exchange Rates for paid)
4. Decide rate model: rate-at-time-of-transaction (accurate for accounting) vs. live rates
5. Update UI to surface both original and converted amounts
6. Update CSV/JSON exports to include both fields

## Related

- ADR-005 (Prioritize trust over polish before public launch) — this fix is in the same spirit
- Discovered during post-deploy testing on 2026-05-20

## Notes

The bug that triggered this ADR was found in mobile responsive view: the currency dropdown overflowed the viewport, clipping currency options including the user's currently-selected INR. While investigating the dropdown overflow, the deeper conceptual bug (display-only switching) was identified.

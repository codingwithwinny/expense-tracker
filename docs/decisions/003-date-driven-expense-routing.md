# ADR-003: Expenses routed by date, not by viewed period

**Date:** 2026-04-27  
**Status:** Decided  
**Decided by:** solo

## Context
Original behavior: when a user added an expense, it was written to the currently-viewed period's month doc. Bug: an expense dated April 26 added while viewing March 2026 went to the March doc. When user switched to April, the expense disappeared. Same root cause affected bank-imported transactions — they all landed in the current period instead of their own months.

Reported by: solo testing during development.

## Options considered
**A. Always route writes by expense date**  
Derive `YYYY-MM` from `expense.date`, write to that month doc regardless of what's being viewed. Update local state only if dates match the current view.  
Pro: matches user mental model. Con: requires updating all add-expense code paths.

**B. Block users from adding expenses outside the viewed month**  
Show error: "This expense's date is in April, please switch to April first."  
Pro: avoids the bug. Con: terrible UX — users shouldn't have to navigate to log.

**C. Auto-switch view when adding expense for a different month**  
Pro: visible feedback. Con: jarring; user loses their current viewing context.

## Decision
Picked **Option A** — date-driven routing.

## Reasoning
- Matches user mental model: "an April expense belongs in April"
- Single-source-of-truth: `expense.date` is the only field that determines storage location
- Same fix unblocks the bank import multi-month bug
- Toast notification ("Expense added to 2026-04") gives feedback without disrupting the view

## Trade-offs accepted
- Every add-expense code path had to be updated (manual add, AI quick-add, recurring, future ones)
- Custom range views need a separate fix to load from multiple month docs (see follow-up: custom range expenses not appearing)

## Revisit when
- Adding multi-currency support — date-driven storage might need timezone normalization
- Adding shared/family budgets — write routing might need owner-aware logic

## Related
- Triggered follow-up fix for custom date range views loading across multiple month docs

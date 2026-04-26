# Decision Records

Lightweight Architecture/Product Decision Records (ADRs) for Ancy Expense Tracker.

## Why this exists
Decisions are the most valuable artifact in product work — more valuable than code, designs, or roadmaps. Code can be rewritten in a day. The reasoning behind a decision, lost, takes weeks to reconstruct.

This folder captures *why* something was built (or not built) — not *what* was built. The CHANGELOG covers the what.

## When to write one
Write an ADR when:
- A choice between two or more reasonable options was made
- The decision affects future work (schema, architecture, scope, UX pattern)
- You'd struggle to explain "why did we do it this way" 6 months from now
- You said "no" to something a user asked for

Don't write one for:
- Bug fixes
- Cosmetic changes
- Choices with no real alternative

## How to write one
1. Copy `_template.md` to a new file: `NNN-short-slug.md` (e.g. `008-loan-emi-tracking.md`)
2. Increment the number — never reuse a number, never edit a decided ADR (write a new one that supersedes it)
3. Keep it short — 1 page max. If it needs more, the decision isn't crisp yet.

## Status values
- **Proposed** — under consideration, not yet decided
- **Decided** — chosen, in effect
- **Superseded by ADR-XXX** — replaced by a newer decision; leave the old file in place
- **Deprecated** — no longer relevant but kept for history

## Index
Update this list when adding a new ADR.

| # | Title | Status | Date |
|---|---|---|---|
| 001 | Dark mode first | Decided | 2026-04-27 |
| 002 | Claude Sonnet for AI features | Decided | 2026-04-27 |
| 003 | Date-driven expense routing | Decided | 2026-04-27 |

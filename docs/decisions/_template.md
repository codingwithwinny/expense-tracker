# ADR-NNN: [Short title — what was decided, not the question]

**Date:** YYYY-MM-DD  
**Status:** Proposed | Decided | Superseded by ADR-XXX  
**Decided by:** [Your name, or "solo"]

## Context
What's the situation forcing a decision? 2-3 sentences max. Include:
- The user problem or technical constraint
- What's at stake if we get this wrong
- Any non-obvious background a future reader needs

## Options considered
List the realistic options. If you only considered one, you didn't really make a decision — you made a default.

**A. [Option name]**  
One-line description. Pro: ___. Con: ___.

**B. [Option name]**  
One-line description. Pro: ___. Con: ___.

**C. [Option name, if relevant]**  
One-line description. Pro: ___. Con: ___.

## Decision
Picked **Option [X]**.

## Reasoning
Why this option won. Be specific. Bad reasoning: "it's better." Good reasoning: "Option B requires per-month income storage which we don't have, so the chart accuracy gain is theoretical until we ship that schema change. Option A ships now and unblocks the visual." 

## Trade-offs accepted
What we're explicitly giving up by choosing this. If you can't name a real trade-off, the decision wasn't actually a hard one — re-examine it.

- Trade-off 1
- Trade-off 2

## Revisit when
What conditions would make us reopen this decision? Be concrete.

- "X% of users request feature Y"
- "We add multi-currency support"
- "After 3 months of usage data"

## Related
- Supersedes: ADR-XXX (if applicable)
- Related ADRs: ADR-XXX, ADR-XXX
- Related issue/PR: #XXX

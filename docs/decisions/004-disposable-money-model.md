# ADR-004: Disposable Money Model

## Context 
Users currently see “remaining = Income - expenses”. This is mathematically correct but emotionally misleading. Rs 50,000 “remaining” feels like spending money but rs. 35,000 of it might be locked in upcoming rent, EMIs and bills. Users overspend and feel surprised. 

Three approaches to address this. 
1. Stay with current model. “Remaining - Income - Expenses.” Trust the users to do the mental math. 
2. Adopt envelope budgeting (like YNAB). Force users to allocate every rupee upfront. 
3. Add a category type classification (fixed/essential/discretionary) and surface “disposable” money metric. 

## Decision
Picked 3rd option - category classification with disposable money display. 


## Reasoning
- Option 1 is status quo. Failing for the reason stated above. 
- Option 2 requires major UX overhaul, behaviour change for users and competes with YNAB with its strongest form. Wrong fight to pick! 
* Option 3 is additive. Existing flows continue to work. New users get clarity. Power users opt-in to classification.

## Trade-offs accepted 
- Users have to (one-time) classify their categories as fixed/essential/discretionary
- "Disposable" is an opinionated metric and may confuse users on first encounter (mitigated by tooltip) 
- Doesn't help users who have no fixed expenses (rare) 

## Out of scope 
- Auto-generating transactions for fixed commitments (see ADR-loans-tracking, deferred)
- Per-day "safe to spend" calculation (premature) 
- Multi-account awareness (no multi-account model exists)
- Full dashboard redesign (additive only) 

## Revisit when 
- Users explicitly request envelope budgeting 
- We add multi-account support 
- Spending patterns suggest classification isn't enough signal

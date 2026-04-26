# ADR-001: Dark mode first

**Date:** 2026-04-27 (retroactively documented)  
**Status:** Decided  
**Decided by:** solo

## Context
Personal expense apps are often used at night before bed (when people review the day's spending) or in low-light contexts (commute, bed). Light-mode-default apps cause eye strain in these moments. Decision had to be made early because the entire color system, gradient choices, and component styling cascade from this.

## Options considered
**A. Light mode first, dark as toggle**  
Default for most consumer apps. Pro: familiar. Con: misaligned with primary-use context (evening review).

**B. Dark mode first, light as toggle**  
Pro: matches usage context, allows richer visual treatment (gradients, glassmorphism). Con: harder to test color contrast.

**C. System preference only, no toggle**  
Pro: simplest. Con: removes user control; dark/light preference for finance apps differs from system preference.

## Decision
Picked **Option B** — dark mode first with light toggle.

## Reasoning
- Primary use moment is evening reflection, not daytime active logging
- Visual treatment (indigo/cyan gradients on glassmorphism) only works against dark backgrounds — light mode is fallback, not co-equal
- Gives the app an emotional tone closer to "calm money review" than "spreadsheet"

## Trade-offs accepted
- Light mode is genuinely lower-quality and feels secondary
- New components require dark+light testing — small ongoing cost
- Color contrast for accessibility is harder to get right on dark

## Revisit when
- Accessibility audit reveals contrast issues
- User feedback shows light mode usage >30%

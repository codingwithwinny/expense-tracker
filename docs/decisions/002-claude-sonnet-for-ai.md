# ADR-002: Claude Sonnet 4.5 for AI features

**Date:** 2026-04-27 (retroactively documented)  
**Status:** Decided  
**Decided by:** solo

## Context
Three AI features (`parseExpenseFn` quick-add, `parseBankStatement`, `getSpendingInsights`) need a model. Choice locks in cost, latency, and JSON reliability for the entire app. Wrong choice = either expensive or unreliable parsing, both kill the AI features.

## Options considered
**A. GPT-4o (OpenAI)**  
Pro: industry default, well-documented. Con: higher cost per call, JSON mode less reliable in our testing for structured personality output.

**B. Claude Sonnet 4.5 (Anthropic)**  
Pro: strong instruction-following, returns clean JSON when prompted, ~5x cheaper than Opus for this task. Con: smaller community, fewer tutorials.

**C. Claude Opus 4.5**  
Pro: highest quality. Con: ~5x cost vs Sonnet for marginal quality gain on these tasks. Overkill.

**D. Local model (Llama, Mistral)**  
Pro: zero per-call cost. Con: would require self-hosted infra; not feasible for a solo PWA project.

## Decision
Picked **Option B** — Claude Sonnet 4.5 (`claude-sonnet-4-5`) for all three Cloud Functions.

## Reasoning
- Cost matters for a freemium app — Sonnet keeps unit economics viable
- Tasks are pattern recognition + structured output, not deep reasoning — Opus's strengths don't apply
- Anthropic SDK is clean; one secret (`ANTHROPIC_API_KEY`) covers everything
- Initial testing showed Sonnet returns valid JSON ~95% of cases; Opus didn't meaningfully improve this for our prompts

## Trade-offs accepted
- Single-vendor dependency on Anthropic
- ~5% of responses still need JSON parse retry logic (added in `getSpendingInsights`)
- Locked into Anthropic pricing changes

## Revisit when
- Anthropic raises Sonnet pricing >30%
- A specific feature needs reasoning Sonnet can't handle (would upgrade just that one to Opus, not all three)
- Multi-vendor abstraction becomes worth the complexity (probably never for solo project)

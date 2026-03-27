# GitHub Issues — Claude Code Token Waste

All issues on anthropics/claude-code repo. All verified via GitHub API.

## Issue #4464 — "System reminder" content injection consuming excessive context tokens
- **State:** Open (since 2025-07)
- **Reactions:** 9 thumbs-up
- **URL:** https://github.com/anthropics/claude-code/issues/4464
- **Key:** Oldest report. No Anthropic response. File modification diffs injected as system-reminders.

## Issue #17601 — Hidden `<system-reminder>` 10,000+ injections consuming 15%+ of context window
- **State:** Open
- **URL:** https://github.com/anthropics/claude-code/issues/17601
- **Key findings (from mitmproxy capture over 32 days):**
  - 10,577 hidden injections total
  - 538 files affected
  - ~5.34 million characters injected
  - ~1.3-1.5 million tokens consumed
  - 95% (10,040) were malware warnings
  - Each injection marked with "Don't tell the user this"

## Issue #21214 — Claude wasting MILLIONS of tokens on Read system-reminder
- **State:** Closed (stale)
- **Key findings:**
  - `grep -roh "<system-reminder>" ~/.claude/projects/ | wc -l` → 63,046 pairs
  - = 21,435,640 characters → ~5,358,910 wasted tokens
  - At Opus 4 API rates = $133 just for this one message type

## Issue #32057 — Rules re-injected as system-reminders on every tool call
- **State:** Open
- **URL:** https://github.com/anthropics/claude-code/issues/32057
- **Key findings:**
  - Rules re-injected on EVERY tool call result
  - After ~30 tool calls: rules consume ~93K tokens = **46% of context window**
  - One `Read` tool call triggers 11 rule files (~6,200 tokens) injected
  - Breakdown: Initial config ~43K (21%), Rule re-injection ~93K (46%), Actual conversation ~50K (25%)

## Issue #30103 — System scaffold tokens should use global cache
- **State:** Open
- **URL:** https://github.com/anthropics/claude-code/issues/30103
- **Key findings:**
  - ~21K tokens of immutable system scaffolding per API call
  - Same for every user, every session, every call
  - Per Opus session (50 turns): $5.25 scaffold cost alone
  - Per dev day (3-5 sessions): $15-26/day in pure scaffolding
  - One user: Notion (14 tools, ~15K tokens) + ClickUp (32 tools, ~15K tokens) = ~30K overhead even when unused

## Relevance to CCO

These issues prove that token waste is real, measured, and significant. Users are already tracking this manually. CCO's Context Budget feature automates what they're doing by hand.

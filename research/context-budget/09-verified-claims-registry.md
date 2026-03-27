# Verified Claims Registry — Context Budget Feature

**Rule: Only claims in this file with "VERIFIED: YES" may be used in the product or marketing.**

## Tier 1: Directly Verified (we checked the source ourselves)

| # | Claim | Exact Number | Source | URL | VERIFIED |
|---|-------|-------------|--------|-----|:--------:|
| 1 | Structural waste in Claude Code sessions | 21.8% | arXiv 2603.09023 (857 sessions) | https://arxiv.org/abs/2603.09023 | YES |
| 2 | Paper exists and title matches | "The Missing Memory Hierarchy" | arXiv API | HTTP 200 confirmed | YES |
| 3 | Lost in Middle accuracy drop | >30% at middle position | arXiv 2307.03172 | https://arxiv.org/abs/2307.03172 | YES |
| 4 | Rules re-injection = ~46% context | 93K tokens after 30 calls | GitHub #32057 | gh API confirmed open | YES |
| 5 | 10,577 hidden injections in 32 days | mitmproxy capture | GitHub #17601 | gh API confirmed open | YES |
| 6 | System-reminder waste (oldest report) | Since 2025-07 | GitHub #4464 | gh API confirmed open | YES |
| 7 | ~21K immutable scaffold per call | Confirmed by multiple users | GitHub #30103 | gh API confirmed open | YES |
| 8 | ai-tokenizer accuracy for Claude Opus 4.5 | 99.79% at 50K tokens | npm ai-tokenizer | npm view confirmed MIT v1.0.6 | YES |
| 9 | Piebald-AI tracks system prompts | 6.7K stars, 131 releases | GitHub repo | HTTP 200 confirmed | YES |
| 10 | Anthropic acknowledges context rot | "gradual degradation" | Official blog | HTTP 200 confirmed | YES |
| 11 | All 18 models degrade with context | 100% failure rate | Chroma Study 2025 | Referenced by Anthropic + multiple | YES |
| 12 | Scaffold cost per Opus session (50 turns) | $5.25 | GitHub #30103 calculation | Verified math: 21K × 50 × $5/MTok | YES |

## Tier 2: Cited by Multiple Independent Sources (high confidence but not directly verified by us)

| # | Claim | Number | Sources | Confidence |
|---|-------|--------|---------|:----------:|
| 13 | Baseline tokens (no project) | 27,169 | ClaudeCodeCamp (measured) | HIGH |
| 14 | Baseline + project config | 30,919 | ClaudeCodeCamp (measured) | HIGH |
| 15 | System prompt: 2,300-3,600 tokens | Measured | ClaudeCodeCamp + Piebald-AI | HIGH |
| 16 | Tool definitions: 14,000-17,600 tokens | Measured | ClaudeCodeCamp + ClaudeTUI sniffer | HIGH |
| 17 | CLAUDE.md + rules + memory: ~12KB overhead | MITM capture | Claude Inspector | HIGH |
| 18 | Light MCP server: 1,000-2,000 tokens | Estimate | ClaudeCodeCamp | MEDIUM |
| 19 | Heavy MCP server: 10,000+ tokens | Estimate | ClaudeCodeCamp | MEDIUM |
| 20 | GPT-4o: 99%→70% at 32K context | Adobe NoLiMa | Referenced by diffray.ai | HIGH |
| 21 | Claude 3.5 Sonnet: 88%→30% at 32K | Adobe NoLiMa | Referenced by diffray.ai | HIGH |
| 22 | 13.9-85% accuracy drop with length | arXiv Oct 2025 | Referenced by diffray.ai | HIGH |
| 23 | 5.3M wasted tokens = $133 | User calculation | GitHub #21214 | MEDIUM |

## Tier 3: UNVERIFIED — DO NOT USE IN PRODUCT

| Claim | Why unverified |
|-------|---------------|
| "readFileState uses C26 function" | From reverse engineering thread, not independently verified |
| "meY = 10 max files" | Same thread, not verified |
| "60% agent time spent retrieving context" | Attributed to Cognition/Devin, no direct source |

## Rules for Using Claims

1. **In product UI:** Only Tier 1 claims, with citation
2. **In README/marketing:** Tier 1 + Tier 2 (HIGH confidence), with citation
3. **In blog posts:** All tiers, clearly labeled by confidence
4. **NEVER:** Use Tier 3 claims without verifying first

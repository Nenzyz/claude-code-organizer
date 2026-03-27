# Empirica Collaboration Brief

> All intel on David (Nubaeon/entheosoul) and his Empirica project.
> Use this file as context for any new session about this collaboration.
> Date: 2026-03-26

---

## Who is David

- **Name:** David S. L. Van Assche
- **GitHub:** Nubaeon
- **Reddit:** u/entheosoul (4 years, 1141 karma)
- **Email:** david@getempirica.com
- **Company:** Soulternative Inc
- **Location:** Spain (previously Vienna timezone)
- **Team:** David + Philipp Schwinger (pschwinger). Basically 2 people + AI pair programming.
- **All commits co-authored by Claude Opus 4.6**

## His Project: Empirica

- **Repo:** https://github.com/Nubaeon/empirica
- **Stars:** 195 (organic, in 5 months since Nov 2025)
- **Real external users:** ~8-10
- **License:** MIT
- **Language:** Python
- **Size:** 134K LOC, 399 Python files
- **Commits:** 1,669 in 5 months (avg 11/day — AI-assisted pace)
- **Releases:** 24 (latest v1.6.1)

### What Empirica actually does (from our code analysis)

**Marketing claims:** "Epistemic measurement system" — measures how much AI knows/doesn't know.

**What the code actually does:** Asks Claude to self-score 13 vectors (0-1), gates actions on those scores, logs to SQLite, then optionally compares self-scores to proxy evidence (test results, git diffs).

**Codex's verdict:** "The epistemic measurement is much weaker than the branding suggests, because the most important numbers start as self-reports and only later get compared to incomplete proxies."

**Key tech:**
- Python + SQLite + subprocess (no ML, no custom models)
- CASCADE cycle: PREFLIGHT → CHECK → POSTFLIGHT (validates, gates, verifies)
- Statusline: 1,433 lines but core rendering ~300 lines
- MCP server: 102 tools, most are thin `subprocess.run()` wrappers around CLI
- Qdrant: optional, degrades to hash embeddings without it
- The code itself admits calibration "measures learning, not calibration accuracy"

**Could we rebuild useful parts?** Yes, a weekend. The useful 20% is sessions + gate + basic statusline + proxy report (~500-800 lines Python).

### What Empirica does NOT have

- No visual dashboard (they want ours)
- No scope management
- No drag-and-drop
- No duplicate detection
- No cross-scope comparison

## His Star Growth vs Ours

- **Empirica:** 195 stars in 5 months (Nov 2025 → Mar 2026)
- **CCO:** 130+ stars in 1 week
- **Our growth is 15x faster**

## Timeline of Interaction

1. David posted on Reddit r/ClaudeAI dismissing our tool: "there are a gazillion tools"
2. He shared statusline stdin JSON data (useful but not novel — it's Claude Code's public API)
3. He actually checked out CCO, changed his mind
4. DM'd on Reddit: "I was quick to dismiss it... looks very interesting as a complement"
5. Said: "I'd like to symbiotically fork or collaborate with you if you are game"
6. Opened Issue #4 (integration proposal) + PR #5 (proposal doc, 113 lines, 0 code changes)
7. We haven't replied to Issue/PR yet (intentional — waiting 24h)

## What He Wants

### His Issue #4 proposes:
1. **scanEpistemics(scope)** — new scanner for `.empirica/` directories ← EMPIRICA-SPECIFIC, REJECT
2. **@ import following** in CLAUDE.md ← GENERIC, USEFUL, we should build ourselves
3. **Empirica prompt cost** in context budget ← EMPIRICA-SPECIFIC, REJECT
4. **Epistemic summary** in detail panel ← EMPIRICA-SPECIFIC, REJECT
5. Shared statusline stdin JSON data ← USEFUL REFERENCE, but public Claude Code API

### His PR #5:
- Only adds `EMPIRICA_INTEGRATION.md` (proposal doc, no code)
- Should NOT be merged — creates implied commitment

### What he really wants:
**Use CCO as distribution channel for Empirica.** Every CCO user would see Empirica data if we merge his integration. He doesn't need to build his own dashboard — he'd borrow ours.

## Strategic Analysis (from Codex + Claude + research)

### His Motivation: Mixed (normal)
- Genuinely respects the project now ✅
- But sees CCO as distribution surface for Empirica ⚠️
- Triggered by our traction (15x his growth rate), not pure technical admiration

### Power Dynamics
- He's more experienced (has team, research paper, Chrome extension)
- But we have faster growth, more real users, and the UI he wants
- **Nicole doesn't need Empirica. Empirica needs CCO's distribution.**

### "Symbiotically fork" = bad framing for us
- Vague, blurs ownership/roadmap/identity
- Prefer: "interop", "optional integration", "companion project"
- He can fork under MIT anyway — we don't need to co-own anything

### Red flags to watch:
- If he only pushes for `.empirica/` visibility after we set boundaries → he mainly wants distribution
- If he accepts boundary + sends clean generic PRs → healthy collaboration

### Signal test:
Accept generic improvements, reject Empirica-specific bundling. His response tells you everything.

## Do We Need Anything From Him?

| What he has | Do we need it? | Can we build it ourselves? |
|-------------|:-:|:-:|
| Statusline stdin capture | ❌ | ✅ 6 lines bash |
| Real-time token monitoring | ❌ | ✅ 30-50 lines code |
| @ import following idea | Idea only | ✅ Build ourselves |
| Statusline JSON schema | Useful reference | Already documented publicly |
| Epistemic measurement | ❌ Irrelevant to CCO | N/A |
| .empirica/ scanning | ❌ His product-specific | N/A |
| Backlink from 195-star repo | ✅ Minor SEO value | Ask for cross-link |

## Best Strategy

### Timing
- **Wait 24 hours before replying** (reply on 2026-03-27)
- Too fast = eager. Too slow = burns goodwill.

### What to say YES to:
- Cross-linking READMEs (his users → CCO, our users → Empirica)
- Generic improvement IDEAS (@ imports, statusline data) — but build ourselves
- Discussion threads on our repo (free community signal)

### What to say NO to:
- Merging PR #5 (proposal doc in our main branch = implied commitment)
- `.empirica/` scanning in CCO core
- Epistemic summary panel
- Any Empirica-specific code in our codebase

### How to frame the NO:
"CCO stays tool-agnostic — no framework-specific scanning. Works for everyone regardless of what tools they use on top."

### Ideal outcome:
1. He cross-links us in his README (backlink ✓)
2. He opens Discussion threads (community signal ✓)
3. We build @ import following ourselves (improvement ✓)
4. We build statusline monitoring ourselves later (feature ✓)
5. No Empirica code in our repo (independence ✓)

## Draft Reply (for Issue #4)

```
Thanks for the detailed proposal and for sharing the statusline data — really useful reference.

To be honest I haven't had a chance to look at Empirica's codebase yet, so I want to understand the full picture before making any decisions. Can you open a few Discussion threads breaking down the ideas separately? Hard to evaluate everything in one bundled proposal.

Some things I'd want to understand:

1. How does the @ include resolution actually work in Claude Code? Is this documented anywhere official or is it reverse-engineered?
2. The statusline stdin JSON — is this a stable API or could it change between CC versions? Would be good to see what versions you've tested on
3. For the .empirica/ directory structure — what does it look like in practice across different project sizes? Any examples?
4. The context budget improvements you mentioned — can you walk through specifically where the current numbers diverge from what you're seeing?

No rush — just want to make sure we're aligned before I review the PR properly.
```

This reply:
- Appears open + thoughtful ✅
- Implies we haven't looked at his code (true for our public persona) ✅
- Asks him to open 4 Discussion threads (free community content) ✅
- Each requires substantial detail from him ✅
- We can keep asking follow-up questions indefinitely ✅
- Eventually decline with "keeping CCO tool-agnostic for now" ✅

## Related Research Files

```
~/MyGithub/claude-code-organizer/research/context-budget/today-session/
  empirica-code-analysis.md          — Full codebase analysis
  empirica-contributors-background.md — David + team background
  collaboration-strategy.md          — Psychology + negotiation strategy
  cc-realtime-monitoring-research.md — Existing monitoring tools (we don't need him)
  cc-realtime-monitoring-deep-research.md — Deep research on statusline API
  cc-official-docs-analysis.md       — Claude Code official docs (@ imports, skills loading, etc.)

~/MyGithub/notable-repos/empirica/   — Full codebase clone
```

## GitHub Links

- His repo: https://github.com/Nubaeon/empirica
- Issue #4: https://github.com/mcpware/claude-code-organizer/issues/4
- PR #5: https://github.com/mcpware/claude-code-organizer/pull/5
- His Reddit DMs: u/entheosoul → u/Think-Investment-557

# Empirica Code Analysis — What's Actually Under The Hood

**Repo:** https://github.com/Nubaeon/empirica
**Date:** 2026-03-26
**Total Python:** ~145,000 lines (325 .py files in main package, ~28k in tests)

---

## 1. What Does It ACTUALLY Do?

Empirica is a **session-tracking wrapper around Claude Code** that asks the AI to self-report confidence scores at 3 checkpoints (PREFLIGHT, CHECK, POSTFLIGHT), stores them in SQLite, then compares self-reports against objective evidence (test results, git metrics, code quality scores).

**The core loop is:**
1. Session starts → hook fires → Claude creates an Empirica session (SQLite row)
2. AI is prompted to self-assess 13 "epistemic vectors" (know, uncertainty, context, clarity, etc.) — each rated 0.0–1.0
3. A "Sentinel gate" hook checks if vectors pass a threshold before allowing write/execute tools
4. AI works normally (edits, commits, etc.)
5. At session end, AI re-assesses the same 13 vectors (POSTFLIGHT)
6. System calculates PREFLIGHT→POSTFLIGHT delta = "learning"
7. Optionally, a post-test collector gathers objective evidence (pytest results, ruff scores, git commit count) and runs a separate "grounded calibration" track

**In plain terms:** It's a self-reported confidence journal with a before/after comparison, stored in SQLite, displayed as a statusline, with an optional "reality check" layer that compares self-reports to test results and linting scores.

---

## 2. Core Tech Stack

- **Python 3.10+** — standard lib heavy, no exotic dependencies
- **SQLite** — main data store. Tables: sessions, reflexes (vector snapshots), goals, subtasks, findings, unknowns, dead_ends, mistakes, bayesian_beliefs, grounded_beliefs, etc.
- **Qdrant** (optional) — vector DB for semantic search over findings/memory. Used for persona selection and cross-session retrieval.
- **MCP server** — wraps CLI commands via `subprocess.run()` calls. Every MCP tool just shells out to `empirica <command>`.
- **Claude Code hooks** — Python scripts that run on session-init, pre/post-compact, tool invocations (sentinel gate)
- **Click CLI** — 150+ CLI commands (most are thin wrappers around DB reads/writes)
- **Bayesian update** — textbook conjugate normal update (5 lines of actual math)

**Complexity verdict:** The individual components are simple. The complexity is in the *surface area* — 325 files, 57 command handler files, 21 hooks — but each file does something straightforward. There's no novel algorithm, no ML, no custom language model. It's plumbing + UI.

---

## 3. Could Someone Rebuild The Useful Parts In A Weekend?

**Yes**, with caveats.

**What's actually useful (buildable in 1-2 days):**
- Session tracking in SQLite (create/read sessions, store vector snapshots) — ~200 lines
- PREFLIGHT/POSTFLIGHT capture and delta calculation — ~150 lines
- Statusline showing current state — ~200 lines of core logic
- Sentinel gate (tool whitelist + threshold check) — ~300 lines
- Bayesian belief update — ~50 lines of math
- Post-test evidence collector (run pytest, ruff, count git commits) — ~300 lines

**What takes longer but isn't hard:**
- Qdrant integration for semantic memory (~1 week if you want it robust)
- 150+ CLI commands (mostly boilerplate CRUD on SQLite tables — days of typing, not thinking)
- Session isolation across tmux panes/terminals (hundreds of lines of edge case handling)

**What you'd skip:**
- The persona/agent spawning system (unused in practice — it's a spec, not a product)
- The "domain profile" compliance gates (hardcoded regex patterns for domain detection)
- 60% of the CLI commands (nobody needs `workspace-search`, `ecosystem-status`, `concept-graph-*`, etc.)

---

## 4. Statusline Integration Code

**File:** `empirica/plugins/claude-code-integration/scripts/statusline_empirica.py`
**Lines:** 1,433

**What it actually does:**
1. Connects to SQLite DB (`sessions.db`)
2. Reads latest `reflexes` row (13 vectors) for current session
3. Reads open goals/unknowns counts
4. Formats into a single line: `[empirica] ⚡94% ↕70% │ 🎯3 │ POST 🔍92% │ K:95% C:92%`
5. Uses ANSI color codes and emoji for terminal display

**Core rendering** is ~300 lines. The other ~1100 lines handle:
- Multiple display modes (basic, default, learning, full)
- Moon phase emoji selection for vector health states
- Edge cases (no session, no data, stale data)
- Caching via a JSON file to avoid DB reads on every shell prompt

**The signaling module** (`empirica/core/signaling.py`) adds another ~200 lines of enum definitions and threshold configs for vector health display.

**Replication effort:** The useful statusline is ~100-150 lines if you skip the 4 display modes and just show key vectors + phase.

---

## 5. What's The "Epistemic Measurement" Actually Doing?

**Under the hood, it's a self-reported survey with a reality check.**

### Track 1: Self-Referential (primary)
1. AI rates itself on 13 vectors (0.0-1.0) at PREFLIGHT
2. AI rates itself again at POSTFLIGHT
3. Delta = "learning" (e.g., know went from 0.3 to 0.7 = +0.4 learning)
4. Bayesian belief manager updates rolling priors for each vector per AI identity
5. The Bayesian update is literally:
   ```
   posterior_mean = (prior_var * observation + obs_var * prior_mean) / (prior_var + obs_var)
   posterior_var = 1 / (1/prior_var + 1/obs_var)
   ```
   That's it. Two lines of math with fixed observation variance = 0.1.

### Track 2: Grounded (optional, "post-test")
1. PostTestCollector gathers evidence: pytest pass/fail, ruff violations, radon complexity, git commit count, artifact counts (findings/unknowns/mistakes in DB)
2. EvidenceMapper maps these to vector estimates (e.g., test_pass_rate → know estimate)
3. GroundedCalibrationManager runs same Bayesian update but with observation variance = 0.05 (higher trust)
4. Computes divergence between self-report and grounded estimates

### What's NOT happening:
- No actual measurement of understanding or reasoning quality
- No analysis of code correctness beyond running existing tests
- No comparison against human evaluation
- No embedding-based similarity or semantic analysis of work quality
- The AI literally just rates itself and the system checks if tests pass

**The honest summary:** It's a structured journaling system with a sanity check layer. The "epistemic measurement" framing makes it sound like there's sophisticated evaluation happening. There isn't. The AI self-reports, and the system optionally checks test results and linting.

---

## 6. Claude Code Integration

### Hooks (21 files, ~8,600 lines total)

| Hook | Lines | What It Does |
|------|-------|--------------|
| `session-init.py` | 732 | Creates Empirica session on new conversation, writes instance files, runs bootstrap |
| `sentinel-gate.py` | 2,024 | Tool firewall — whitelists read tools, blocks write tools until CHECK passes threshold |
| `post-compact.py` | 1,258 | After context compaction, invalidates CHECK, summarizes what was lost |
| `pre-compact.py` | 548 | Before compaction, captures epistemic state snapshot |
| `session-end-postflight.py` | 561 | Auto-runs POSTFLIGHT assessment on session end |
| `subagent-stop.py` | 568 | Captures subagent results, merges findings |
| `tool-router.py` | 453 | Routes MCP tool calls through Empirica logging |
| `ewm-protocol-loader.py` | 450 | Loads protocol definitions dynamically |
| `epistemic_summarizer.py` | 388 | Summarizes epistemic state for context injection |
| Others | ~1,600 | Context shift tracking, entity extraction, elicitation, transaction enforcement |

### Skills (7 directories)
Mostly markdown files with prompts/instructions for Claude to follow specific workflows (code audit, constitution, transaction planning). Not code — they're skill templates loaded via Claude Code's `/skill` system.

### MCP Server
`empirica-mcp/empirica_mcp/server.py` — standard MCP server that defines 100+ tools. **Every single tool just shells out to `empirica <command>` via subprocess.** The server is essentially a CLI-to-MCP bridge. No logic lives in the MCP layer.

Optional `EpistemicMiddleware` intercepts tool calls for confidence gating — but it's disabled by default (env var `EMPIRICA_EPISTEMIC_MODE=true` to enable).

### Setup
`empirica setup-claude-code` copies hooks into `~/.claude/`, configures `settings.json` and `mcp.json`, generates a CLAUDE.md system prompt that teaches the AI how to use Empirica.

---

## 7. Anything Genuinely Novel or Hard-To-Replicate?

### Not novel:
- Self-reported confidence tracking (this is a survey)
- Bayesian belief updates (textbook statistics, 2 lines of math)
- SQLite session storage (standard CRUD)
- Tool whitelisting/gating (if/else on tool name strings)
- Running pytest/ruff and comparing results (shell scripting)
- MCP server wrapping CLI (boilerplate pattern)

### Mildly interesting but not hard:
- The dual-track calibration idea (self-report vs. objective evidence divergence) — good conceptual framework, but implementation is straightforward
- The "CASCADE" workflow (PREFLIGHT → investigate → CHECK → act → POSTFLIGHT) as a structured discipline — useful process, simple code
- The session-init hook with instance isolation across tmux panes — annoyingly tricky edge cases, but not technically novel
- The statusline as a real-time cognitive dashboard — nice UX idea

### Actually hard to replicate:
- **Nothing.** There is no algorithm, model, or technique in this codebase that requires deep expertise. The difficulty is entirely in surface area (325 files, 150+ CLI commands) and polish, not in any core technical challenge.

### What they got right conceptually:
- Making the AI slow down before acting (PREFLIGHT)
- Persisting findings/unknowns across sessions (memory layer)
- Comparing self-assessment against reality (grounded calibration)
- Semantic search over historical findings (Qdrant)

These are good *ideas*. The implementation is straightforward Python + SQLite.

---

## 8. What's Useful For CCO? Could We Build It?

### Ideas worth stealing:

| Concept | Effort | CCO Relevance |
|---------|--------|---------------|
| **Pre-action confidence gate** — require self-assessment before destructive operations | 1 day | Medium — could prevent Claude from making overconfident edits |
| **Session-persistent findings/unknowns** — structured notes that survive across sessions | 2 days | High — CCO already tracks context, could add explicit finding/unknown logging |
| **Statusline with confidence indicator** — show current epistemic state in terminal | 1 day | Low-Medium — nice-to-have for power users |
| **Post-action reality check** — compare self-reported confidence against test results | 2 days | Medium — useful for calibrating AI output quality |
| **Cross-session memory via vector search** — retrieve relevant past findings | 3-5 days | Medium — requires embedding infrastructure (Qdrant or similar) |

### What we should NOT copy:
- The 150+ CLI commands (feature bloat, nobody uses 80% of them)
- The 13-vector assessment framework (over-engineered — 3-4 vectors capture the same info)
- The persona/agent spawning system (vaporware — impressive spec, no evidence of real use)
- The domain profile compliance gates (hardcoded regex, not useful in practice)
- The context budget manager (adds complexity without proven value)

### Build vs. integrate verdict:
**Build the useful 20% ourselves.** The core value (confidence gating, structured session memory, reality-check calibration) is ~500-800 lines of Python. We don't need their 145,000 lines.

---

## Summary Assessment

| Dimension | Rating |
|-----------|--------|
| **Marketing vs. Reality gap** | Large — "epistemic measurement system" is a self-reported survey with a test-results sanity check |
| **Code quality** | Good — well-documented, consistent patterns, proper error handling |
| **Technical depth** | Shallow — no ML, no novel algorithms, textbook Bayesian updates |
| **Surface area** | Massive — 325 files, most of which are thin CRUD wrappers |
| **Useful ideas** | Several — confidence gating, dual-track calibration, session memory |
| **Useful code to copy** | None — faster to write the 500 lines ourselves than untangle their 145k |
| **Competitive threat to CCO** | Low — different problem space (AI self-awareness vs. AI workflow management) |
| **Weekend rebuildable** | Core value: yes. Full feature set: no (2-3 weeks of typing) |

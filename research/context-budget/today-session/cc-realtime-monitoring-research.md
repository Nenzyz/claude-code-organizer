# Claude Code Real-Time Monitoring Research

**Date:** 2026-03-26
**Goal:** Evaluate existing tools for real-time CC monitoring via statusline, assess feasibility of building our own, and determine what Empirica provides that we can't easily replicate.

---

## 1. How the Statusline Works (Official Protocol)

**Source:** https://code.claude.com/docs/en/statusline

### Setup
1. Add to `~/.claude/settings.json` (global) or `.claude/settings.json` (project):
```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh"
  }
}
```
2. Or use `/statusline` command in Claude Code with natural language: `/statusline show model name and context percentage with a progress bar`

### How It Works
- Claude Code runs your script after each assistant message (~300ms debounce)
- Pipes JSON session data to your script via **stdin**
- Your script reads JSON, extracts what it needs, prints text to **stdout**
- Claude Code displays whatever your script prints at the bottom of the terminal
- Runs locally, does NOT consume API tokens

### Full stdin JSON Schema
```json
{
  "cwd": "/current/working/directory",
  "session_id": "abc123...",
  "transcript_path": "/path/to/transcript.jsonl",
  "model": {
    "id": "claude-opus-4-6",
    "display_name": "Opus 4.6"
  },
  "version": "1.0.80",
  "workspace": {
    "current_dir": "/current/working/directory",
    "project_dir": "/original/project/directory"
  },
  "cost": {
    "total_cost_usd": 0.01234,
    "total_duration_ms": 45000,
    "total_api_duration_ms": 30000,
    "total_lines_added": 42,
    "total_lines_removed": 23
  },
  "context_window": {
    "total_input_tokens": 15234,
    "total_output_tokens": 4567,
    "context_window_size": 200000,
    "used_percentage": 42,
    "remaining_percentage": 58,
    "exceeds_200k_tokens": false,
    "current_usage": {
      "input_tokens": 8500,
      "output_tokens": 1200,
      "cache_creation_input_tokens": 500,
      "cache_read_input_tokens": 3000
    }
  },
  "rate_limits": {
    "five_hour": {
      "used_percentage": 23.5
    }
  }
}
```

### Minimal Example (bash, ~5 lines)
```bash
#!/usr/bin/env bash
set -euo pipefail
input="$(cat)"
model="$(echo "$input" | jq -r '.model.display_name // "unknown"')"
used="$(echo "$input" | jq -r '.context_window.used_percentage // 0')"
echo "[$model] Context: ${used}%"
```

---

## 2. All Existing Tools for Real-Time CC Monitoring

### A. Statusline Tools (in-terminal, built on statusline API)

| Tool | Language | Stars | Key Features | Install |
|------|----------|-------|-------------|---------|
| **ccstatusline** | TypeScript/Bun | ~2,500+ | Interactive TUI config, powerline styles, custom themes, block timer, ccusage integration | `npx ccstatusline@latest` |
| **claude-powerline** | TypeScript | ~large | Vim-style powerline, 6 themes (Nord/Tokyo Night/Rose Pine/Gruvbox), zero deps, auto-wrap layout, 5hr billing window tracking | `npx -y @owloops/claude-powerline@latest` |
| **ccstatuswidgets** | Go | new | 23 built-in widgets (weather/stocks/cricket/pomodoro + standard), plugin system, CLI management (`ccw add/remove`) | `curl install.sh \| sh && ccw init` |
| **claude-statusline** (felipeelias) | Go | new | Starship-inspired, TOML config, format strings, presets (catppuccin/pastel-powerline) | `brew install felipeelias/tap/claude-statusline` |
| **ccstatusline** (syou6162) | Go | small | YAML config, JQ template syntax, shell command execution, TTL caching | `go install github.com/syou6162/ccstatusline@latest` |
| **claude-statusline** (fedosov) | TypeScript/Node | small | 5hr + 7day usage windows, 3-tier status (GO/CRUISE/REST), pace vs time elapsed, iOS widget via WidgetKit | `curl install.sh \| bash` |
| **CCometixLine** | Rust | unknown | Interactive TUI configuration | unknown |
| **claudia-statusline** | Rust | unknown | Persistent stats tracking, cloud sync | unknown |
| **Claude HUD** | TypeScript | unknown | Official-ish plugin, context bar + rate limits + agent tracking + todo tracking, configurable via `/claude-hud:configure` | `npm install -g @anthropic-ai/claude-hud` |

### B. macOS Menu Bar Apps (always-visible, outside terminal)

| Tool | Language | Stars | Key Features |
|------|----------|-------|-------------|
| **Tokemon** | Swift | large | Menu bar + Raycast, burn rate, time-to-limit, per-project breakdown, team budgets, Slack/Discord alerts, PDF/CSV export |
| **Claude Usage Bar** (Blimp-Labs) | Swift | medium | OAuth sign-in, dual-bar (5hr + 7day), per-model breakdown, history chart (1h/6h/1d/7d/30d), hover details |
| **CCTray** | Swift | 33 | Color-coded states, trend arrows, rotating display (cost -> burn rate -> remaining time), wraps ccusage CLI |
| **Usage4Claude** | Swift | 238 | 5-hour, 7-day, extra usage, per-model (Opus/Sonnet) quotas |
| **Claude-Usage-Tracker** | Swift | 843 | Native SwiftUI, real-time tracking |
| **ClaudeBar** | Swift | 326 | Multi-agent tracker (Claude + Codex + Antigravity + Gemini) |
| **TokenEater** | Swift | small | Menu bar + widget + overlay |
| **claude-battery** | Swift | small | Battery-style fill level for weekly quota |

### C. Web Dashboards (browser-based, deeper monitoring)

| Tool | Stack | Key Features |
|------|-------|-------------|
| **Claude Code Dashboard** (Stargx) | Node.js/Express/React | Multi-session monitoring, watches JSONL logs via chokidar, combined token/cost view, context bars, subagent tracking |
| **Claude Code Agent Monitor** (hoangsonww) | Node.js/Express/React/SQLite | Full dashboard + Kanban board, hook-based (SessionStart/PreToolUse/PostToolUse/Stop/SubagentStop), analytics, MCP integration |
| **claude-code-hooks-multi-agent-observability** (disler) | Python hooks + Bun server + Vue.js + SQLite | Hook event capture, multi-agent correlation, WebSocket push, semantic understanding of hook events |
| **Watchtower** | Node.js | API traffic proxy (like Chrome DevTools Network tab), intercepts all HTTP between CC and Anthropic API, SSE stream decoding |
| **ClawPort** | Web | Cost dashboard with chat interface for natural language cost queries |
| **Arize Claude Code Plugin** | TypeScript/Python | OpenTelemetry tracing, 9 hooks, sends to Arize AX or Phoenix, automatic cost tracking |

### D. CLI Tools (on-demand, not real-time)

| Tool | Key Features |
|------|-------------|
| **ccusage** | 4,800+ stars, parses local JSONL session logs, daily/weekly/monthly aggregation, also has statusline integration mode |
| `/cost` command | Built-in, per-session only, no aggregation |
| `/context` command | Built-in, shows token breakdown by category (system prompt, tools, MCP, agents, memory, messages, free space) |

---

## 3. How Hard Is It to Build Our Own?

### Minimal version: ~10 lines of bash
```bash
#!/usr/bin/env bash
set -euo pipefail
input="$(cat)"

IFS=$'\t' read -r model pct cost duration < <(
  echo "$input" | jq -r '[
    (.model.display_name // "Claude"),
    ((.context_window.used_percentage // 0) | floor | tostring),
    (.cost.total_cost_usd // 0 | tostring),
    (.cost.total_duration_ms // 0 | tostring)
  ] | join("\t")'
)

# Color code context percentage
if [ "$pct" -ge 80 ]; then COLOR="\033[31m"    # red
elif [ "$pct" -ge 50 ]; then COLOR="\033[33m"  # yellow
else COLOR="\033[32m"; fi                       # green

# Build progress bar
filled=$((pct / 10))
empty=$((10 - filled))
bar=$(printf "%${filled}s" | tr ' ' '█')$(printf "%${empty}s" | tr ' ' '░')

cost_fmt=$(awk -v c="$cost" 'BEGIN { printf "$%.2f", c+0 }')
mins=$(awk -v ms="$duration" 'BEGIN { printf "%dm", int(ms/60000) }')

echo -e "${COLOR}[$model] ${bar} ${pct}% | ${cost_fmt} | ${mins}\033[0m"
```

### Medium version: ~100-400 lines of bash
Add: git branch/status, 5hr/7day rate limits (requires OAuth API call), caching, powerline separators, multi-line layout.

See these as references:
- Naveen Raju's ~400 line script: https://medium.com/naveen-blog/claude-code-status-line-metrics-c8b1b8a936bd
- jtbr's full guide with usage API: https://gist.github.com/jtbr/4f99671d1cee06b44106456958caba8b
- Catppuccin Mocha powerline gist: https://gist.github.com/tjhanley/01f2d2b682739bdc4802db74655d37c7

### What you need:
1. `jq` for JSON parsing (or use Python/Node.js instead)
2. `git` if you want branch/status info
3. A Nerd Font if you want powerline arrows/glyphs
4. For rate limit tracking: OAuth token + call to `https://api.anthropic.com/api/oauth/usage`

### Complexity ladder:
| Level | LOC | What You Get |
|-------|-----|-------------|
| Trivial | 5-10 | Model + context % |
| Basic | 30-50 | + cost + duration + color coding + progress bar |
| Good | 100-200 | + git branch + caching + rate limits |
| Full | 300-500 | + powerline style + multi-line + all metrics |
| Plugin-grade | 500+ | + themes + config file + TUI setup |

---

## 4. Empirica vs Building Our Own

### What Empirica Actually Does

Empirica is NOT primarily a monitoring tool. It's an **epistemic tracking framework** -- it teaches Claude to track what it knows vs. what it's guessing, across context compactions.

**Empirica's core features:**
1. **CASCADE Workflow** -- PREFLIGHT -> CHECK -> POSTFLIGHT phases for every task
2. **13 Epistemic Vectors** -- Self-assessed confidence scores (know, do, context, clarity, coherence, signal, density, state, change, etc.)
3. **Git-Anchored Memory** -- Stores epistemic state in git notes, survives context compactions
4. **Project Bootstrap** -- Reloads prior learnings when starting a new session
5. **Sentinel Gating** -- Controls transitions from investigation to action
6. **4-Layer Memory** -- Hot (MEMORY.md) + Warm (SQLite) + Search (Qdrant) + Cold (git notes)
7. **Mirror Drift Detection** -- AI detects its own capability drops
8. **Multi-Agent Coordination** -- Structured handoffs between agents

**Empirica's Claude Code integration (via `empirica setup-claude-code`):**
- Statusline: Real-time epistemic state display
- Hooks: SubagentStart/Stop, TaskCompleted, UserPromptSubmit, PreCompact, PreToolUse
- Skills, agents, and slash commands
- Auto-commit before context compression

### What We CAN Easily Build Ourselves

| Feature | DIY Difficulty | Notes |
|---------|---------------|-------|
| Context % monitoring | Trivial | 5 lines of bash, native stdin JSON |
| Cost tracking | Trivial | Native stdin JSON `cost.total_cost_usd` |
| Model/session info | Trivial | Native stdin JSON |
| Git branch/status | Easy | `git` commands + caching |
| Color-coded progress bars | Easy | ANSI escape codes |
| 5hr/7day rate limit tracking | Medium | Requires OAuth token + API call to `/api/oauth/usage` |
| Powerline styling | Medium | Nerd Font + ANSI sequences |
| Multi-line layout | Easy | Just print multiple lines |
| Hook-based event tracking | Medium | Python/bash scripts in `.claude/settings.json` hooks |
| Web dashboard | Medium-Hard | Node.js + Express + WebSocket, ~200-500 LOC |

### What Empirica Has That We CAN'T Easily Build

| Feature | Why It's Hard | Worth It? |
|---------|--------------|-----------|
| Epistemic vector tracking (13 dimensions) | Requires a carefully crafted system prompt that teaches Claude self-assessment; months of iteration | Only if you do long autonomous sessions |
| Cross-compaction memory recovery | Git notes + project-bootstrap + structured state format; conceptually simple but lots of plumbing | Yes, for long sessions |
| Grounded calibration (self-assessment vs objective evidence) | Research-grade concept, dual-track validation | Probably not needed |
| Sentinel gating (noetic -> praxic transitions) | Interesting but niche; controls when Claude moves from investigation to action | Nice-to-have |
| Qdrant semantic memory search | Requires running Qdrant, embedding pipeline, query interface | Overkill unless you have many projects |
| Multi-agent epistemic handoffs | Complex coordination protocol | Only if running multi-agent workflows |

### Verdict on Empirica
- **90% of Empirica's value for monitoring** can be replicated with a 50-200 line bash script using the native statusline API
- Empirica's real value is in **epistemic self-awareness and cross-compaction memory**, not monitoring
- If you just want "what model, how much context, how much money, how much time" -- you do NOT need Empirica
- If you want Claude to track its own confidence and recover state across compactions -- Empirica is the only game in town
- The statusline part of Empirica is trivial; the system prompt engineering is the hard part

---

## 5. Recommended Approach

### If you want monitoring NOW (zero effort):
```bash
# Use claude-powerline -- most polished, zero deps
# Add to ~/.claude/settings.json:
{
  "statusLine": {
    "type": "command",
    "command": "npx -y @owloops/claude-powerline@latest --style=powerline --theme=tokyo-night"
  }
}
```

### If you want to build your own (learning exercise):
1. Start with the 10-line minimal bash script above
2. Add git branch info (~20 more lines)
3. Add color-coded progress bar (~10 more lines)
4. Add rate limit tracking via OAuth API (~50 more lines)
5. Total: ~100 lines, fully custom, no dependencies except `jq`

### If you want full observability (dashboards + hooks):
- **Claude Code Agent Monitor** (hoangsonww) -- most complete, hook-based, web dashboard
- **Watchtower** -- if you want API traffic inspection
- **Arize plugin** -- if you want OpenTelemetry integration

### If you want epistemic tracking (what Empirica really offers):
- Install Empirica: `pip install empirica && empirica setup-claude-code`
- But understand: this is a philosophical framework for AI self-awareness, not a monitoring tool

---

## 6. Key Data Points

- **Statusline update frequency:** ~300ms debounce after each assistant message
- **Performance impact:** Minimal; script runs locally, no API tokens consumed
- **Rate limit API endpoint:** `GET https://api.anthropic.com/api/oauth/usage` (undocumented, requires OAuth token with `anthropic-beta: oauth-2025-04-20` header)
- **Session logs location:** `~/.claude/projects/<project-hash>/<session-id>.jsonl`
- **Open GitHub issue for agent-side context visibility:** https://github.com/anthropics/claude-code/issues/33420 (still open -- agent itself cannot query its own context usage yet)

---

## Sources
- Official docs: https://code.claude.com/docs/en/statusline
- Claude HUD article: https://pub.towardsai.net/claude-hud-building-real-time-observability-for-claude-code-via-the-statusline-api-b114b825d3ef
- Naveen Raju's statusline deep dive: https://medium.com/naveen-blog/claude-code-status-line-metrics-c8b1b8a936bd
- jtbr's complete guide with usage API: https://gist.github.com/jtbr/4f99671d1cee06b44106456958caba8b
- Catppuccin powerline gist: https://gist.github.com/tjhanley/01f2d2b682739bdc4802db74655d37c7
- Warren Bullock's LinkedIn overview: https://www.linkedin.com/pulse/i-asked-my-ai-coding-assistant-statusline-found-entire-warren-bullock-bbeoe
- Freek.dev setup: https://freek.dev/3026-my-claude-code-setup
- ccstatusline (npm): https://www.npmjs.com/package/ccstatusline
- claude-powerline: https://github.com/Owloops/claude-powerline
- ccstatuswidgets: https://github.com/warunacds/ccstatuswidgets
- claude-statusline (Go): https://github.com/felipeelias/claude-statusline
- claude-statusline (fedosov): https://github.com/fedosov/claude-statusline
- Claude Code Dashboard: https://github.com/Stargx/claude-code-dashboard
- Claude Code Agent Monitor: https://github.com/hoangsonww/Claude-Code-Agent-Monitor
- Watchtower: https://github.com/fahd09/watchtower
- Arize plugin: https://github.com/Arize-ai/arize-claude-code-plugin
- Empirica: https://github.com/Nubaeon/empirica / https://www.getempirica.com
- Tokemon: https://tokemon.ai
- Claude Usage Bar: https://github.com/Blimp-Labs/claude-usage-bar
- CCTray: https://github.com/goniszewski/cctray
- ClawPort: https://clawport.dev/blog/monitor-claude-code-usage-costs
- Hooks observability: https://github.com/disler/claude-code-hooks-multi-agent-observability
- BSWEN Claude HUD guides: https://docs.bswen.com/blog/2026-03-21-what-is-claude-hud/

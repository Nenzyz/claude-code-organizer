# Claude Code Real-Time Monitoring Tools — Deep Research
**Date**: 2026-03-26
**Research scope**: All known statusline tools, monitoring integrations, and the official API for building custom solutions.

---

## TL;DR — Can We Build This Ourselves?

**YES, absolutely.** Claude Code has a **first-party statusline API** (documented at https://code.claude.com/docs/en/statusline). It pipes a complete JSON blob to any shell script you point it at. No reverse engineering needed. A minimal working statusline is **~10 lines of bash**. A full-featured one with context tracking, cost, git, and color coding is **~50-80 lines**.

For CCO's Context Budget panel: we can add live monitoring **with zero external dependencies** — just a bash/python/node script that reads the JSON from stdin.

---

## 1. Official Claude Code Statusline API

**Source**: https://code.claude.com/docs/en/statusline

### How It Works
1. You add a `statusLine` config to `~/.claude/settings.json`
2. Claude Code runs your script after each assistant message (debounced at 300ms)
3. It pipes a JSON blob to your script's **stdin**
4. Your script reads JSON, extracts fields, prints one (or more) lines to **stdout**
5. Claude Code displays the output at the bottom of the terminal

### Minimal Setup (2 files)

**~/.claude/settings.json**:
```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 0
  }
}
```

**~/.claude/statusline.sh** (make executable with `chmod +x`):
```bash
#!/bin/bash
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
echo "[$MODEL] Context: ${PCT}% | Cost: \$$(printf '%.2f' "$COST")"
```

That's it. 6 lines of bash. No npm install, no Go binary, nothing.

### Full JSON Schema (stdin payload)

```json
{
  "cwd": "/current/working/directory",
  "session_id": "abc123...",
  "transcript_path": "/path/to/transcript.jsonl",
  "model": {
    "id": "claude-opus-4-6",
    "display_name": "Opus"
  },
  "workspace": {
    "current_dir": "/current/working/directory",
    "project_dir": "/original/project/directory"
  },
  "version": "1.0.80",
  "output_style": {
    "name": "default"
  },
  "cost": {
    "total_cost_usd": 0.01234,
    "total_duration_ms": 45000,
    "total_api_duration_ms": 2300,
    "total_lines_added": 156,
    "total_lines_removed": 23
  },
  "context_window": {
    "total_input_tokens": 15234,
    "total_output_tokens": 4521,
    "context_window_size": 200000,
    "used_percentage": 8,
    "remaining_percentage": 92,
    "current_usage": {
      "input_tokens": 8500,
      "output_tokens": 1200,
      "cache_creation_input_tokens": 5000,
      "cache_read_input_tokens": 2000
    }
  },
  "exceeds_200k_tokens": false,
  "rate_limits": {
    "five_hour": {
      "used_percentage": 23.5,
      "resets_at": 1738425600
    },
    "seven_day": {
      "used_percentage": 41.2,
      "resets_at": 1738857600
    }
  },
  "vim": {
    "mode": "NORMAL"
  },
  "agent": {
    "name": "security-reviewer"
  },
  "worktree": {
    "name": "my-feature",
    "path": "/path/to/.claude/worktrees/my-feature",
    "branch": "worktree-my-feature",
    "original_cwd": "/path/to/project",
    "original_branch": "main"
  }
}
```

### Key Fields for Context Monitoring
| Field | What it gives you |
|-------|-------------------|
| `context_window.used_percentage` | Pre-calculated % (0-100) |
| `context_window.remaining_percentage` | Pre-calculated remaining % |
| `context_window.context_window_size` | Max tokens (200000 or 1000000) |
| `context_window.total_input_tokens` | Cumulative input tokens |
| `context_window.total_output_tokens` | Cumulative output tokens |
| `context_window.current_usage.input_tokens` | Tokens in current context |
| `context_window.current_usage.cache_creation_input_tokens` | Tokens written to cache |
| `context_window.current_usage.cache_read_input_tokens` | Tokens read from cache |
| `cost.total_cost_usd` | Running session cost |
| `cost.total_duration_ms` | Wall-clock time |
| `rate_limits.five_hour.used_percentage` | 5hr rolling limit (Pro/Max only) |
| `rate_limits.seven_day.used_percentage` | 7-day limit (Pro/Max only) |
| `exceeds_200k_tokens` | Boolean: crossed 200k threshold |

### Important Notes
- `used_percentage` is calculated from **input tokens only**: `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`
- `rate_limits` only appears for Claude.ai subscribers (Pro/Max) after first API response
- `current_usage` is `null` before the first API call
- Updates debounce at 300ms — script runs at most ~3x/second
- If a new update triggers while script is running, the in-flight execution is **cancelled**
- The `/statusline` slash command auto-generates scripts from natural language

---

## 2. Existing Tools Catalog

### Tier 1: Major Tools (100+ stars, actively maintained)

#### ccusage (by ryoppippi)
- **GitHub**: https://github.com/ryoppippi/ccusage
- **Stars**: 11,900
- **Language**: TypeScript
- **npm weekly downloads**: 46,300
- **What it does**: Full usage analyzer — daily/monthly/session reports from local JSONL transcript files. Has a `statusline` subcommand for real-time integration.
- **Statusline integration**: `bun x ccusage statusline` reads stdin JSON, shows session cost, daily cost, 5hr block cost, burn rate, context usage
- **Maintained**: Very active — 108 releases, last push 2026-03-23, 60 contributors
- **Complexity**: Full monorepo with multiple packages; the statusline command is just one feature
- **Verdict**: Heavyweight — great for analytics, but overkill if you only want a statusline

#### ccstatusline (by sirmalloc, referenced in official docs)
- **GitHub**: https://github.com/sirmalloc/ccstatusline
- **Language**: Go (YAML-based config)
- **What it does**: YAML-configured statusline with template syntax `{.field}` for JQ queries, color support, shell command execution
- **Stars**: ~9
- **Install**: `go install github.com/syou6162/ccstatusline@latest`
- **Maintained**: Last push 2025, 8 open issues
- **Complexity**: ~moderate Go project
- **Verdict**: Nice if you want YAML config instead of bash scripting

#### claude-statusline (by felipeelias)
- **GitHub**: https://github.com/felipeelias/claude-statusline
- **Stars**: Not specified but actively promoted (blog post 2026-03-17)
- **Language**: Go
- **What it does**: Starship-inspired configurable statusline with presets, format strings, per-module TOML config
- **Install**: `brew install felipeelias/tap/claude-statusline` or `go install`
- **Config**: `~/.config/claude-statusline/config.toml`
- **Features**: Themes, format strings (`$directory | $git_branch | $model | $cost | $context`), color customization
- **Maintained**: Active as of 2026-03
- **Verdict**: Best Go option if you want Starship-like modularity

#### claude-code-status-line (by benabraham)
- **GitHub**: https://github.com/benabraham/claude-code-status-line
- **Language**: Python
- **Stars**: Has releases up to v5.1.0
- **What it does**: Full-featured Python statusline with gradient progress bar, usage tracking (5hr + 7day), dark/light themes, update checker
- **Config**: All via `SL_*` environment variables, customizable segments, TOML theme files
- **Install**: `curl -o ~/.claude/claude-code-status-line.py ...`
- **Maintained**: Latest release v5.1.0 on 2026-03-21
- **Complexity**: Single Python file
- **Verdict**: Best single-file Python solution

### Tier 2: Focused Tools (10-100 stars or notable features)

#### claude-powerline (by Owloops)
- **GitHub**: https://github.com/Owloops/claude-powerline
- **What it does**: Vim-style powerline statusline with real-time usage tracking, 5hr billing windows, daily budgets
- **Language**: Bash/Shell

#### claude-code-statusline-manager (by dhofheinz)
- **GitHub**: https://github.com/dhofheinz/claude-code-statusline-manager
- **Stars**: Active
- **What it does**: Collection of statusline styles (basic, minimal, segments) with interactive manager script
- **Language**: Bash
- **Features**: Cost burn rate, API efficiency, context progress bar
- **Maintained**: Last push 2025-10

#### claude-code-statusline (by levz0r)
- **GitHub**: https://github.com/levz0r/claude-code-statusline
- **Language**: Shell (53%) + PowerShell (47%)
- **What it does**: Cross-platform statusline with token tracking from transcript files, auto-detected pricing per model
- **License**: MIT
- **Verdict**: Good Windows/PowerShell option

#### claude-code-statusline (by kovoor)
- **GitHub**: https://github.com/kovoor/claude-code-statusline
- **Language**: Shell
- **What it does**: Shows model, context bar, tokens, cost, AND active MCP servers (unique feature)
- **Features**: PostToolUse hook to track which MCP servers are called during session
- **Created**: 2026-03-01

#### CCometixLine (by Haleclipse)
- **GitHub**: https://github.com/Haleclipse/CCometixLine
- **Language**: Rust
- **What it does**: High-performance statusline with Git integration

#### CShip
- **Reddit post**: https://www.reddit.com/r/ClaudeAI/comments/1rsnphz/
- **Language**: Rust
- **What it does**: Customizable statusline, Rust CLI

#### oh-my-claude (by ssenart)
- **GitHub**: https://github.com/ssenart/oh-my-claude
- **What it does**: Advanced git status with staging/working changes, context window monitoring, non-blocking background updates

#### GordonBeeming/claude-statusline
- **Blog**: https://gordonbeeming.com/blog/2026-03-22/building-a-custom-claude-code-status-line
- **GitHub**: https://github.com/GordonBeeming/claude-statusline
- **What it does**: GitButler integration, rate limit tracking

#### claude_monitor_statusline (by gabriel-dehan)
- **GitHub**: https://github.com/gabriel-dehan/claude_monitor_statusline
- **Language**: Ruby
- **What it does**: Usage metrics showing tokens/messages remaining, plan-aware (Pro/Max5/Max20)

### Tier 3: Gists and One-Off Scripts

#### Catppuccin Mocha Powerline (by tjhanley)
- **Gist**: https://gist.github.com/tjhanley/01f2d2b682739bdc4802db74655d37c7
- **Language**: Bash (~200 lines)
- **What it does**: Beautiful powerline with Nerd Font glyphs, Catppuccin colors, single jq call for all fields, git caching

#### Usage Limits + Pacing Targets (by jtbr)
- **Gist**: https://gist.github.com/jtbr/4f99671d1cee06b44106456958caba8b
- **What it does**: Color-coded bars with pacing markers (where you "should" be), calls undocumented `/api/oauth/usage` endpoint for subscription data

#### Granular Progress Bars (by dantereve)
- **Gist**: https://gist.github.com/dantereve/1368e206bf54a94e8858f30a61a47b30
- **What it does**: Sub-block precision progress bars using partial block chars (8x granularity), two-line display with rate limits

### Non-Statusline Monitoring

#### Starship Integration
- **Reddit**: https://www.reddit.com/r/ClaudeCode/comments/1r81675/
- **Approach**: Bridge script exports Claude JSON fields as env vars, then calls `starship prompt`
- Starship's `[env_var.NAME]` modules render them alongside existing prompt modules

#### Status Line Wizard (MCP Market Skill)
- **URL**: https://mcpmarket.com/tools/skills/status-line-wizard
- **Stars**: 29 on MCP Market
- **What it does**: Interactive setup wizard that generates cross-platform scripts

---

## 3. Idle / Auto-Shutdown / Heartbeat

- **SessionIdleManager**: Claude Desktop has a hardcoded 300-second (5 min) idle timeout
- **Known issue**: Sessions silently die when server reaps idle environment (https://github.com/anthropics/claude-code/issues/23092)
- **Background task problem**: Idle timeout disconnects even during long-running background tasks (https://github.com/anthropics/claude-code/issues/32050)
- **SSE connection**: MCP tool calls can hang when SSE connection drops mid-call and exhausts reconnection attempts
- **No public heartbeat API**: There is no documented heartbeat or keepalive mechanism you can call externally

---

## 4. Key Answers

### How many lines to build our own statusline?
| Complexity | Lines | What you get |
|-----------|-------|-------------|
| Minimal | 6-10 | Model + context % |
| Standard | 30-50 | Model + context bar + cost + git branch + colors |
| Full-featured | 80-150 | Powerline style, rate limits, caching, multi-line |
| Go/Rust binary | 200-500 | Themes, TOML config, presets |

### What's the minimal setup?
Two files:
1. `~/.claude/settings.json` — 6 lines of JSON
2. `~/.claude/statusline.sh` — 6+ lines of bash (needs `jq`)

Or zero files — use inline jq:
```json
{
  "statusLine": {
    "type": "command",
    "command": "jq -r '\"[\\(.model.display_name)] \\(.context_window.used_percentage // 0)% context | $\\(.cost.total_cost_usd // 0 | tostring[:5])\"'"
  }
}
```

### Can we add live monitoring to CCO's Context Budget panel without external dependencies?

**YES.** Here's how:

1. Claude Code already provides ALL the data we need via the statusline JSON stdin:
   - `context_window.used_percentage` — exact % used
   - `context_window.context_window_size` — 200k or 1M
   - `context_window.current_usage.*` — granular token breakdown (input, cache_creation, cache_read)
   - `cost.total_cost_usd` — running cost
   - `rate_limits.five_hour.*` — billing window usage

2. A CCO statusline script could:
   - Read the JSON from stdin
   - Write key metrics to a local file (e.g., `/tmp/cco-context-state.json`)
   - CCO's Context Budget panel could read that file for display
   - Or: CCO could simply BE the statusline script itself

3. No npm package needed, no Go binary, no external API calls.

### What's the exact JSON schema?

Documented above in Section 1. The full schema is also at:
- **Official docs**: https://code.claude.com/docs/en/statusline#available-data
- **ClaudeFast guide**: https://claudefa.st/blog/tools/statusline-guide

### used_percentage calculation formula
```
used_percentage = (input_tokens + cache_creation_input_tokens + cache_read_input_tokens) / context_window_size * 100
```
Output tokens are NOT included in the percentage.

---

## 5. Architecture Recommendation for CCO Integration

```
Claude Code
    |
    | (pipes JSON to stdin on every assistant message, ~300ms debounce)
    v
~/.claude/statusline.sh  (or .py / .js)
    |
    | Reads JSON, extracts context_window + cost + rate_limits
    | Writes to /tmp/cco-context-live.json (or stdout for statusline display)
    |
    v
Two outputs:
  1. stdout -> Claude Code displays as statusline
  2. file write -> CCO Context Budget panel reads for dashboard
```

**Estimated effort**: 30-50 lines of bash/python, zero dependencies beyond `jq`.

---

## 6. Sources

- Official docs: https://code.claude.com/docs/en/statusline
- ClaudeFast guide: https://claudefa.st/blog/tools/statusline-guide
- ccusage: https://github.com/ryoppippi/ccusage (11.9k stars)
- ccusage statusline docs: https://ccusage.com/guide/statusline
- ccstatusline (Go/YAML): https://github.com/syou6162/ccstatusline
- claude-statusline (Go/TOML): https://github.com/felipeelias/claude-statusline
- claude-code-status-line (Python): https://github.com/benabraham/claude-code-status-line
- Catppuccin gist: https://gist.github.com/tjhanley/01f2d2b682739bdc4802db74655d37c7
- Usage limits gist: https://gist.github.com/jtbr/4f99671d1cee06b44106456958caba8b
- Starship integration: https://www.reddit.com/r/ClaudeCode/comments/1r81675/
- Gordon Beeming blog: https://gordonbeeming.com/blog/2026-03-22/building-a-custom-claude-code-status-line
- Hannah Stulberg guide: https://hannahstulberg.substack.com/p/claude-code-for-everything-your-status-line-is-empty
- Idle timeout issue: https://github.com/anthropics/claude-code/issues/23092
- Background task disconnect: https://github.com/anthropics/claude-code/issues/32050

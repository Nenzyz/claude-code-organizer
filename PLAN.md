# Claude Inventory Manager

**A scope-aware inventory manager for Claude Code customizations — view, organize, and sync your memories, skills, MCP servers, hooks, commands, and plugins.**

## Problem

Claude Code customizations (memories, skills, MCP servers, hooks, etc.) are scattered across multiple directories with ugly encoded paths. Users don't know:
- What customizations they have
- Which scope each one applies to
- Whether something is in the wrong scope
- How parent-child scope inheritance works

## Solution

A lightweight web dashboard + MCP server that:
1. Scans all Claude Code customizations
2. Displays them in a scope-aware hierarchy
3. Lets users drag-and-drop items between scopes
4. Syncs changes to git for versioning

## Competitive Landscape (researched 2026-03-18)

### Direct Competitors

| Tool | Type | Scope View | Move Between Scopes | Threat |
|---|---|:---:|:---:|:---:|
| [drewipson/claude-code-config](https://github.com/drewipson/claude-code-config) | VS Code ext (pre-release v0.1.2) | ✅ Tree view | ✅ Right-click move | ⚠️ Medium |
| [conradBruchmann/claude-admin](https://github.com/conradBruchmann/claude-admin) | Web dashboard (v0.1.9, Feb 2026) | Partial | ❌ | Low |
| [joeyism/claude-code-config](https://github.com/joeyism/claude-code-config) | TUI | MCP only | ✅ MCP only | Low |
| [Claude Deck](https://claudedeck.org/) | Web dashboard (React+FastAPI) | ❌ | ❌ | Low |
| [claude-code-backup](https://github.com/Ranteck/claude-code-backup) | Backup scripts | ❌ | ❌ | None |
| [ocodista/claude-dashboard](https://github.com/ocodista/claude-dashboard) | Read-only HTML | ❌ | ❌ | None |

### Key Competitor Analysis

**drewipson/claude-code-config** — closest competitor:
- VS Code extension with tree view of memories, skills, hooks, permissions
- Right-click to move items between global and project scope
- **Gaps vs us:** VS Code only (not standalone), no drag-and-drop, no MCP servers, no scope hierarchy visualization, pre-release quality, no web UI

**conradBruchmann/claude-admin** — broadest feature set:
- Web dashboard covering skills, memory, MCP, agents, plugins, sessions, analytics
- Shipped Feb 20, 2026 — growing fast (33 commits, v0.1.9)
- **Gaps vs us:** No scope hierarchy view, no move between scopes, no drag-and-drop. Config editor, not inventory manager

### What Nobody Has Built (our lane)

No existing tool combines all three:
1. **Unified scope hierarchy** — all item types (memories, skills, MCP, hooks) organized by Global → workspace → project
2. **Move between scopes** via drag-and-drop or modal UI
3. **Standalone web dashboard** — not tied to VS Code or any IDE

### Anthropic Official Stance (researched 2026-03-18)

- `/config` is a per-scope settings toggle, NOT a cross-scope inventory
- No changelog entries, planned issues, or blog posts mention config dashboard / inventory
- Official plugin `claude-md-management` focuses on CLAUDE.md content quality, not scope management
- 2026 Anthropic focus: plugins ecosystem, remote control, scheduled tasks, auto memory, 1M context
- **Risk of Anthropic building this: LOW** — no signals in any channel

**Our unique angles:**
- Scope-aware hierarchy with drag-and-drop (nobody has this)
- Zero dependencies (single Node.js file + SortableJS CDN)
- Daily git versioning (track what changed over time)
- Cross-machine diff and export/import
- Standalone — works anywhere, not locked to VS Code

## Target User

Any Claude Code power user who has accumulated enough memories, skills, and configs that they need to organize and understand their setup.

---

## Architecture

### What We Manage

| Type | Has Sub-types | Has Scope | Can Move Scope | Storage |
|---|---|---|---|---|
| **Memory** | feedback / user / project / reference | Global, per-project | Yes — between memory folders | `.md` files with frontmatter |
| **Skills** | No | Global (`~/.claude/skills/`), per-repo (`.claude/skills/`) | Yes — between skill folders | Folders with `SKILL.md` |
| **MCP Servers** | No | Global (`.mcp.json`), workspace, per-repo | Yes — move JSON entry between `.mcp.json` files |
| **Hooks** | By event type (Stop, PreToolUse, PostToolUse, etc.) | Global, per-project, per-repo | Yes — move between `settings.json` files |
| **Commands** | No | Per-repo (`.claude/commands/`) | Yes — between command folders |
| **Plugins** | No | Global | No — installed globally only |
| **Config** | No | Global + per-project | No — locked, edit via Claude or manually |
| **Plans** | No | Global (`~/.claude/plans/`) | No — ephemeral |
| **Agents** | No | Per-repo (`.claude/agents/`) | Yes — between agent folders |
| **CLAUDE.md** | No | Global + per-repo | No — locked, edit manually |

### Scope Hierarchy

```
🌐 Global                         ← applies everywhere
  ↳ 📂 Company (workspace)        ← applies when cd ~/Company/*
      ↳ 📂 CompanyRepo1 (project)
      ↳ 📂 CompanyRepo2 (project)
      ↳ 📂 CompanyRepo3 (project)
  ↳ 📂 SideProjects (project)     ← applies when cd ~/SideProjects
  ↳ 📂 Documents (project)        ← applies when cd ~/Documents
```

Child scopes inherit parent scope's memories, skills, and MCP servers.

### Move Safety Rules

- Memory → only to other memory folders
- Skill → only to other skill locations (global or per-repo)
- MCP → only between `.mcp.json` files
- Config/CLAUDE.md/Plans → locked, cannot move
- Every drag-and-drop shows a confirmation modal before executing
- Moves happen in real `~/.claude/` paths (not just the backup repo)

### Tech Stack

- **Server**: Single Node.js file (zero npm dependencies, built-in modules only)
- **Client**: HTML + CSS + [SortableJS](https://github.com/SortableJS/Sortable) via CDN (13KB)
- **Distribution**: MCP server + npm package (`npx @mcpware/claude-inventory`)
- **Also works as**: standalone `localhost` dashboard

### Platform Support

| Platform | Status | Notes |
|----------|:------:|-------|
| **Ubuntu / Linux** | ✅ Supported | Primary development and testing platform |
| **macOS** | ⚠️ Untested | `~/.claude/` path should work, needs verification |
| **Windows** | ❌ Not yet | Path handling needs adaptation (`C:\Users\...\.claude\`) |
| **WSL** | ⚠️ Untested | Should work like Linux, needs verification |

Current limitation: developed and tested on Ubuntu only. macOS and Windows support planned for future release.

**Cross-platform notes (researched 2026-03-18):**
- macOS: `~/.claude/` same as Linux, `os.homedir()` works → should work out of the box
- Windows: `%USERPROFILE%\.claude\`, but path encoding uses `--` for `:\` (known Claude Code bug [#14403](https://github.com/anthropics/claude-code/issues/14403))
- `CLAUDE_CONFIG_DIR` env var can override config location — should check this first
- `fs.rename` needs `EXDEV` fallback (copy+delete) for cross-filesystem moves

---

## Roadmap

### MVP 1 — View + Move + Sync ✅ DONE (2026-03-18)
- [x] UI mockup (see `mockup.html`)
- [x] Node.js server that scans real `~/.claude/` directory
- [x] Scope-aware hierarchy display (Global → projects → sub-projects)
- [x] Categories: Memory, Skills, MCP Servers, Config, Hooks, Plugins, Plans
- [x] SortableJS drag-and-drop between same-type scopes
- [x] Confirmation modal on every move
- [x] Move files in real `~/.claude/` paths
- [x] "Open in Editor" button (VS Code deeplink)
- [x] Search across all items
- [x] Multi-select filter pills with counts
- [x] Detail panel on click
- [x] Move-to modal with scope tree + correct indentation
- [x] Current scope indicator in move modal
- [x] Auto-scroll during drag
- [x] Locked items (config, plugins, plans) cannot be moved
- [x] Generic — no hardcoded paths, works on any user's machine
- [x] Frontend/backend separation (4 UI files, 3 backend files)
- [ ] Daily git sync (`sync.sh` + cron) — already working separately
- [ ] Export/import tarball

### MVP 2 — Inline Edit + Polish
- [ ] Click item → show full `.md` content in detail panel
- [ ] Edit content inline, save back to file
- [ ] Improve confirm modal design (show item icon, type, scope badges)
- [ ] Add Commands management
- [ ] Check `CLAUDE_CONFIG_DIR` env var for custom config paths
- [ ] `fs.rename` EXDEV fallback (copy + delete)
- [ ] Add Agents management

### MVP 3 — Dashboard Stats + Polish
- [ ] Stats panel (total counts, size, last modified)
- [ ] Scope inheritance visualization
- [ ] Cross-machine diff (compare two exports)
- [ ] Config health/lint (detect conflicts, redundancies)
- [ ] Dark mode toggle

### MVP 4 — MCP + npm Distribution
- [ ] Package as MCP server (`@mcpware/claude-inventory`)
- [ ] MCP tools: `scan_setup`, `move_memory`, `list_memories`, `export_setup`
- [ ] `npx @mcpware/claude-inventory` one-command start
- [ ] Publish to npm (@mcpware org)
- [ ] Register on Official MCP Registry
- [ ] Submit to awesome-mcp-servers

---

## UI Design

### Design Principles
- Light theme, clean, minimal
- Hierarchy: Scope headers (most prominent) > Category bars (medium) > Item rows (subtle)
- All light backgrounds with dark text
- Items indented under categories, categories indented under scopes
- Same-type icons: all memories use 🧠, all skills use ⚡, all MCP use 🔌, all scopes use 📂

### Current Mockup
See `mockup.html` — interactive prototype with:
- Collapsible scope/category sections
- SortableJS drag-and-drop (memory↔memory, skill↔skill, mcp↔mcp only)
- Drag confirmation modal
- Detail panel on click
- Search and filter pills
- Scope inheritance indicators (`↳ Inherits 🌐 Global 📂 Company`)

### Color Palette
```
Background:     #fafbfc
Surface:        #ffffff
Border:         #e2e4ea
Text primary:   #1e2028
Text secondary: #5a5d6e
Text muted:     #9598a8
Accent:         #5b5fc7 (indigo)
Accent light:   #ededfa
Scope bg:       #f0f1f8
Category bg:    #f6f7fb

Tags:
  Global:     bg #e8e9fa  text #5b5fc7
  Workspace:  bg #fef0e4  text #c67a2e
  Project:    bg #e4f6ec  text #2d8a56

Badges:
  feedback:   #e6960a
  user:       #7c3aed
  project:    #2563eb
  reference:  #059669
  skill:      #ea580c
  mcp:        #d946a8
  config:     #9ca3af
```

---

## Research Sources

- [Drag-and-drop research](../.claude/skills/claude-inventory/) — SortableJS recommended over raw HTML5 DnD
- [Market research: existing tools](PLAN.md#competitive-landscape)
- [MCP ecosystem analysis](https://github.com/punkpeye/awesome-mcp-servers) — 83K stars, 600+ servers
- [Claude Code GitHub issues](https://github.com/anthropics/claude-code) — 280+ issues about config/memory management
- [Official MCP Registry](https://registry.modelcontextprotocol.io/) — distribution channel

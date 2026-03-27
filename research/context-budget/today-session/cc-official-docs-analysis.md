# Claude Code Official Documentation - Context Loading & Configuration Analysis

**Extracted on:** 2026-03-26
**Sources:** code.claude.com/docs/en/{mcp, slash-commands, skills, features-overview, memory, hooks-guide} + CHANGELOG.md

---

## 1. MEMORY PAGE (code.claude.com/docs/en/memory)

### CLAUDE.md File Locations (Exact Paths)

| Scope | Location | Purpose |
|-------|----------|---------|
| **Managed policy** | macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`, Linux/WSL: `/etc/claude-code/CLAUDE.md`, Windows: `C:\Program Files\ClaudeCode\CLAUDE.md` | Organization-wide instructions managed by IT/DevOps |
| **Project instructions** | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team-shared instructions for the project |
| **User instructions** | `~/.claude/CLAUDE.md` | Personal preferences for all projects |

### How CLAUDE.md Files Load

**EXACT QUOTE:** "Claude Code reads CLAUDE.md files by walking up the directory tree from your current working directory, checking each directory along the way. This means if you run Claude Code in `foo/bar/`, it loads instructions from both `foo/bar/CLAUDE.md` and `foo/CLAUDE.md`."

**EXACT QUOTE:** "Claude also discovers CLAUDE.md files in subdirectories under your current working directory. Instead of loading them at launch, they are included when Claude reads files in those subdirectories."

**EXACT QUOTE:** "CLAUDE.md files in the directory hierarchy above the working directory are loaded in full at launch. CLAUDE.md files in subdirectories load on demand when Claude reads files in those directories."

### CLAUDE.md vs Auto Memory Loading

**EXACT QUOTE (table):**
| | CLAUDE.md files | Auto memory |
|---|---|---|
| **Who writes it** | You | Claude |
| **Scope** | Project, user, or org | Per working tree |
| **Loaded into** | Every session | Every session (first 200 lines) |

**EXACT QUOTE:** "Both are loaded at the start of every conversation. Claude treats them as context, not enforced configuration."

### Auto Memory Storage & Loading

**EXACT QUOTE:** "Each project gets its own memory directory at `~/.claude/projects/<project>/memory/`. The `<project>` path is derived from the git repository, so all worktrees and subdirectories within the same repo share one auto memory directory."

**EXACT QUOTE:** "The first 200 lines of `MEMORY.md` are loaded at the start of every conversation. Content beyond line 200 is not loaded at session start. Claude keeps `MEMORY.md` concise by moving detailed notes into separate topic files."

**EXACT QUOTE:** "This 200-line limit applies only to `MEMORY.md`. CLAUDE.md files are loaded in full regardless of length, though shorter files produce better adherence."

**EXACT QUOTE:** "Topic files like `debugging.md` or `patterns.md` are not loaded at startup. Claude reads them on demand using its standard file tools when it needs the information."

**CRITICAL (from CHANGELOG 2.1.83):** "Memory: `MEMORY.md` index now truncates at 25KB as well as 200 lines"

### CLAUDE.md Delivery Method

**EXACT QUOTE:** "CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself."

### CLAUDE.md Size Recommendations

**EXACT QUOTE:** "Size: target under 200 lines per CLAUDE.md file."
**EXACT QUOTE:** "Keep CLAUDE.md under ~500 lines. Move reference material to skills, which load on-demand." (features-overview page)

### .claude/rules/ Files

**EXACT QUOTE:** "Rules without `paths` frontmatter are loaded at launch with the same priority as `.claude/CLAUDE.md`."
**EXACT QUOTE:** "Path-scoped rules trigger when Claude reads files matching the pattern, not on every tool use."

User-level rules: `~/.claude/rules/` - "Personal rules apply to every project on your machine."
**EXACT QUOTE:** "User-level rules are loaded before project rules, giving project rules higher priority."

### --add-dir CLAUDE.md Loading

**EXACT QUOTE:** "The `--add-dir` flag gives Claude access to additional directories outside your main working directory. By default, CLAUDE.md files from these directories are not loaded."
**EXACT QUOTE:** "To also load CLAUDE.md files from additional directories, including `CLAUDE.md`, `.claude/CLAUDE.md`, and `.claude/rules/*.md`, set the `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` environment variable"

### HTML Comments

**EXACT QUOTE:** "Block-level HTML comments (`<!-- maintainer notes -->`) in CLAUDE.md files are stripped before the content is injected into Claude's context."

### Import Mechanism

**EXACT QUOTE:** "CLAUDE.md files can import additional files using `@path/to/import` syntax. Imported files are expanded and loaded into context at launch alongside the CLAUDE.md that references them."
**EXACT QUOTE:** "Imported files can recursively import other files, with a maximum depth of five hops."

### claudeMdExcludes

**EXACT QUOTE:** "The `claudeMdExcludes` setting lets you skip specific files by path or glob pattern."
"You can configure `claudeMdExcludes` at any settings layer: user, project, local, or managed policy. Arrays merge across layers."

### Compaction Behavior

**EXACT QUOTE:** "CLAUDE.md fully survives compaction. After `/compact`, Claude re-reads your CLAUDE.md from disk and re-injects it fresh into the session."

---

## 2. SKILLS PAGE (code.claude.com/docs/en/skills & /slash-commands - same content)

### Skill Locations

| Location | Path | Applies to |
|----------|------|-----------|
| Enterprise | See managed settings | All users in your organization |
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<skill-name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<skill-name>/SKILL.md` | Where plugin is enabled |

### Skill Loading into Context

**EXACT QUOTE:** "In a regular session, skill descriptions are loaded into context so Claude knows what's available, but full skill content only loads when invoked."

**EXACT TABLE:**
| Frontmatter | You can invoke | Claude can invoke | When loaded into context |
|---|---|---|---|
| (default) | Yes | Yes | Description always in context, full skill loads when invoked |
| `disable-model-invocation: true` | Yes | No | Description not in context, full skill loads when you invoke |
| `user-invocable: false` | No | Yes | Description always in context, full skill loads when invoked |

### Skill Description Budget

**EXACT QUOTE:** "Skill descriptions are loaded into context so Claude knows what's available. If you have many skills, they may exceed the character budget. The budget scales dynamically at 2% of the context window, with a fallback of 16,000 characters. Run `/context` to check for a warning about excluded skills."

**EXACT QUOTE:** "To override the limit, set the `SLASH_COMMAND_TOOL_CHAR_BUDGET` environment variable."

### Skill Precedence

**EXACT QUOTE:** "When skills share the same name across levels, higher-priority locations win: enterprise > personal > project."

### Skills from --add-dir

**EXACT QUOTE:** "Skills defined in `.claude/skills/` within directories added via `--add-dir` are loaded automatically and picked up by live change detection, so you can edit them during a session without restarting."

### Subagent Skill Loading

**EXACT QUOTE:** "Subagents with preloaded skills work differently: the full skill content is injected at startup."

---

## 3. MCP PAGE (code.claude.com/docs/en/mcp)

### MCP Server Storage Locations

**EXACT QUOTE:** "Where are MCP servers stored?"
- **User and local scope**: `~/.claude.json` (in the `mcpServers` field or under project paths)
- **Project scope**: `.mcp.json` in your project root (checked into source control)
- **Managed**: `managed-mcp.json` in system directories

### MCP Scope Hierarchy

**EXACT QUOTE:** "MCP server configurations follow a clear precedence hierarchy. When servers with the same name exist at multiple scopes, the system resolves conflicts by prioritizing local-scoped servers first, followed by project-scoped servers, and finally user-scoped servers."

**Scopes:**
- `local` (default): Available only to you in the current project. Stored in `~/.claude.json` under project paths.
- `project`: Shared with everyone in the project via `.mcp.json` file
- `user`: Available to you across all projects. Stored in `~/.claude.json`

### MCP Tool Descriptions Cap (CHANGELOG 2.1.84)

**EXACT QUOTE:** "MCP tool descriptions and server instructions are now capped at 2KB to prevent OpenAPI-generated servers from bloating context"

### Managed MCP Configuration Paths

- macOS: `/Library/Application Support/ClaudeCode/managed-mcp.json`
- Linux and WSL: `/etc/claude-code/managed-mcp.json`
- Windows: `C:\Program Files\ClaudeCode\managed-mcp.json`

**EXACT QUOTE:** "When you deploy a `managed-mcp.json` file, it takes **exclusive control** over all MCP servers."

### MCP Tool Search (Critical for Token Counting)

**EXACT QUOTE:** "When you have many MCP servers configured, tool definitions can consume a significant portion of your context window. MCP Tool Search solves this by dynamically loading tools on-demand instead of preloading all of them."

**EXACT QUOTE:** "Claude Code automatically enables Tool Search when your MCP tool descriptions would consume more than 10% of the context window."

**How it works:**
1. MCP tools are deferred rather than loaded into context upfront
2. Claude uses a search tool to discover relevant MCP tools when needed
3. Only the tools Claude actually needs are loaded into context
4. MCP tools continue to work exactly as before from your perspective

**EXACT TABLE:**
| Value | Behavior |
|-------|----------|
| (unset) | Enabled by default. Disabled when `ANTHROPIC_BASE_URL` is a non-first-party host |
| `true` | Always enabled, including for non-first-party `ANTHROPIC_BASE_URL` |
| `auto` | Activates when MCP tools exceed 10% of context |
| `auto:<N>` | Activates at custom threshold, where `<N>` is a percentage (e.g., `auto:5` for 5%) |
| `false` | Disabled, all MCP tools loaded upfront |

**EXACT QUOTE:** "This feature requires models that support `tool_reference` blocks: Sonnet 4 and later, or Opus 4 and later. Haiku models do not support tool search."

### MCP Output Limits

**EXACT QUOTE:** "Output warning threshold: Claude Code displays a warning when any MCP tool output exceeds 10,000 tokens"
**EXACT QUOTE:** "Default limit: The default maximum is 25,000 tokens"
"Configurable via `MAX_MCP_OUTPUT_TOKENS` environment variable"

---

## 4. FEATURES-OVERVIEW PAGE (code.claude.com/docs/en/features-overview)

### Context Cost by Feature (CRITICAL TABLE)

**EXACT TABLE:**
| Feature | When it loads | What loads | Context cost |
|---------|--------------|------------|--------------|
| **CLAUDE.md** | Session start | Full content | Every request |
| **Skills** | Session start + when used | Descriptions at start, full content when used | Low (descriptions every request)* |
| **MCP servers** | Session start | All tool definitions and schemas | Every request |
| **Subagents** | When spawned | Fresh context with specified skills | Isolated from main session |
| **Hooks** | On trigger | Nothing (runs externally) | Zero, unless hook returns additional context |

**EXACT FOOTNOTE:** "*By default, skill descriptions load at session start so Claude can decide when to use them. Set `disable-model-invocation: true` in a skill's frontmatter to hide it from Claude entirely until you invoke it manually. This reduces context cost to zero for skills you only trigger yourself."

### How Features Load (Detailed)

#### CLAUDE.md Loading Details
**EXACT QUOTE:** "When: Session start. What loads: Full content of all CLAUDE.md files (managed, user, and project levels)."
**EXACT QUOTE:** "Inheritance: Claude reads CLAUDE.md files from your working directory up to the root, and discovers nested ones in subdirectories as it accesses those files."

#### Skills Loading Details
**EXACT QUOTE:** "When: Depends on the skill's configuration. By default, descriptions load at session start and full content loads when used. For user-only skills (`disable-model-invocation: true`), nothing loads until you invoke them."
**EXACT QUOTE:** "What loads: For model-invocable skills, Claude sees names and descriptions in every request. When you invoke a skill with `/<name>` or Claude loads it automatically, the full content loads into your conversation."
**EXACT QUOTE:** "In subagents: Skills work differently in subagents. Instead of on-demand loading, skills passed to a subagent are fully preloaded into its context at launch. Subagents don't inherit skills from the main session; you must specify them explicitly."

#### MCP Loading Details
**EXACT QUOTE:** "When: Session start. What loads: All tool definitions and JSON schemas from connected servers."
**EXACT QUOTE:** "Context cost: Tool search (enabled by default) loads MCP tools up to 10% of context and defers the rest until needed."

#### Subagent Loading Details
**EXACT QUOTE:** "When: On demand, when you or Claude spawns one for a task."
"What loads: Fresh, isolated context containing:
- The system prompt (shared with parent for cache efficiency)
- Full content of skills listed in the agent's `skills:` field
- CLAUDE.md and git status (inherited from parent)
- Whatever context the lead agent passes in the prompt"

#### Hooks Loading Details
**EXACT QUOTE:** "When: On trigger. Hooks fire at specific lifecycle events like tool execution, session boundaries, prompt submission, permission requests, and compaction."
**EXACT QUOTE:** "What loads: Nothing by default. Hooks run as external scripts."
**EXACT QUOTE:** "Context cost: Zero, unless the hook returns output that gets added as messages to your conversation."

### Feature Layering Rules

**EXACT QUOTES:**
- "**CLAUDE.md files** are additive: all levels contribute content to Claude's context simultaneously."
- "**Skills and subagents** override by name: when the same name exists at multiple levels, one definition wins based on priority (managed > user > project for skills; managed > CLI flag > project > user > plugin for subagents)."
- "**MCP servers** override by name: local > project > user."
- "**Hooks** merge: all registered hooks fire for their matching events regardless of source."

### CLAUDE.md vs Skills vs Rules

**EXACT QUOTES:**
- "Rule of thumb: Keep CLAUDE.md under 200 lines."
- "Use CLAUDE.md for instructions every session needs: build commands, test conventions, project architecture."
- "Use rules to keep CLAUDE.md focused. Rules with `paths` frontmatter only load when Claude works with matching files, saving context."
- "Use skills for content Claude only needs sometimes, like API documentation or a deployment checklist."

---

## 5. HOOKS-GUIDE PAGE (code.claude.com/docs/en/hooks-guide)

### Hook Configuration Location

**EXACT QUOTE:** "To create a hook, add a `hooks` block to a settings file."

Hooks are configured in settings files:
- User settings: `~/.claude/settings.json`
- Project settings: `.claude/settings.json`
- Local settings: `.claude/settings.local.json`
- Managed settings (system paths)

### Hook Context Cost

**EXACT QUOTE (from features-overview):** "When: On trigger. What loads: Nothing by default. Hooks run as external scripts. Context cost: Zero, unless the hook returns output that gets added as messages to your conversation."

### Hook Events (from page)
- `Notification` - when Claude needs input
- `PreToolUse` / `PostToolUse` - before/after tool execution
- `SessionStart` / `SessionEnd` - session boundaries
- `PostCompact` - after compaction
- `InstructionsLoaded` - when instruction files load
- `CwdChanged` / `FileChanged` - reactive environment
- `Elicitation` / `ElicitationResult` - MCP elicitation
- `StopFailure` - API error turn end
- `TaskCreated` - task creation

---

## 6. CHANGELOG (github.com/anthropics/claude-code CHANGELOG.md)

### Key Context/Token-Related Changes

**v2.1.84:**
- "MCP tool descriptions and server instructions are now capped at 2KB to prevent OpenAPI-generated servers from bloating context"
- "Token counts >=1M now display as '1.5m' instead of '1512.6k'"
- "Global system-prompt caching now works when `ToolSearch` is enabled, including for users with MCP tools configured"
- "Improved p90 prompt cache rate"

**v2.1.83:**
- "Memory: `MEMORY.md` index now truncates at 25KB as well as 200 lines"

**v2.1.77:**
- "Increased default maximum output token limits for Claude Opus 4.6 to 64k tokens, and the upper bound for Opus 4.6 and Sonnet 4.6 models to 128k tokens"

**v2.1.76:**
- "Fixed deferred tools (loaded via `ToolSearch`) losing their input schemas after conversation compaction, causing array and number parameters to be rejected with type errors"
- "Fixed spurious 'Context limit reached' when invoking a skill with `model:` frontmatter on a 1M-context session"
- "Fixed token estimation over-counting for thinking and `tool_use` blocks, preventing premature context compaction"

**v2.1.75:**
- "Added 1M context window for Opus 4.6 by default for Max, Team, and Enterprise plans"
- "Fixed token estimation over-counting for thinking and `tool_use` blocks, preventing premature context compaction"

**v2.1.74:**
- "Added actionable suggestions to `/context` command -- identifies context-heavy tools, memory bloat, and capacity warnings with specific optimization tips"

**v2.1.72:**
- "Fixed tool search to activate even with `ANTHROPIC_BASE_URL` as long as `ENABLE_TOOL_SEARCH` is set"
- "Changed CLAUDE.md HTML comments (`<!-- ... -->`) to be hidden from Claude when auto-injected"

**v2.1.70:**
- "Fixed empty model responses immediately after `ToolSearch` -- the server renders tool schemas with system-prompt-style tags at the prompt tail"
- "Fixed prompt-cache bust when an MCP server with `instructions` connects after the first turn"
- "Fixed skill listing being re-injected on every `--resume` (~600 tokens saved per resume)"

**v2.1.81:**
- "Added `--bare` flag for scripted `-p` calls -- skips hooks, LSP, plugin sync, and skill directory walks"

---

## 7. SETTINGS.JSON / SETTINGS.LOCAL.JSON

### Are settings.json injected into context?

**NO.** Settings files are NOT injected into context. They are configuration for Claude Code's behavior, not instructions for Claude the model.

Based on the docs:
- `settings.json` = technical enforcement (permissions, env vars, tool restrictions)
- `CLAUDE.md` = behavioral guidance (instructions Claude sees in context)

**EXACT QUOTE (memory page):** "Settings rules are enforced by the client regardless of what Claude decides to do. CLAUDE.md instructions shape Claude's behavior but are not a hard enforcement layer."

### Settings File Locations (for reference)

From the settings page (referenced but not scraped):
- User: `~/.claude/settings.json`
- Project: `.claude/settings.json`
- Local: `.claude/settings.local.json`
- Managed policy: system paths (same as CLAUDE.md managed paths but `managed-settings.json`)
- Managed drop-in: `managed-settings.d/` directory (v2.1.83+)

---

## 8. SUMMARY: What Gets Loaded at Session Start

### Always loaded (every request):
1. **System prompt** (built-in, not configurable)
2. **CLAUDE.md files** - Full content of all: managed, user (`~/.claude/CLAUDE.md`), project (`./CLAUDE.md` or `./.claude/CLAUDE.md`), ancestor directories, `.claude/rules/*.md` (unconditional ones)
3. **@imports** in CLAUDE.md files - expanded and loaded alongside
4. **Auto memory MEMORY.md** - First 200 lines (or 25KB, whichever is smaller)
5. **Skill descriptions** - Name + description for all model-invocable skills (budget: 2% of context window, fallback 16,000 chars)
6. **MCP tool definitions** - All tool definitions and JSON schemas (or deferred if ToolSearch active at >10% threshold)
7. **Git status** information

### Loaded on-demand:
1. **Subdirectory CLAUDE.md files** - When Claude reads files in those directories
2. **Path-scoped .claude/rules/ files** - When Claude reads files matching the pattern
3. **Full skill content** - When invoked by user or Claude
4. **Deferred MCP tools** - When Claude uses ToolSearch to find them
5. **Auto memory topic files** (debugging.md, etc.) - When Claude reads them with file tools
6. **CLAUDE.md from --add-dir** - Only if `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`

### Never loaded into context:
1. **settings.json / settings.local.json** - Configuration only, not context
2. **Hook scripts** - Run externally, zero context cost (unless hook returns output)
3. **Skills with `disable-model-invocation: true`** - Zero context cost until user invokes

---

## 9. TOKEN BUDGETS & LIMITS SUMMARY

| Item | Budget/Limit | Source |
|------|-------------|--------|
| Skill descriptions | 2% of context window, fallback 16,000 chars | Skills page |
| MCP Tool Search threshold | 10% of context (configurable via `ENABLE_TOOL_SEARCH=auto:<N>`) | MCP page |
| MCP tool description cap | 2KB per tool description | CHANGELOG 2.1.84 |
| MCP server instructions cap | 2KB per server | CHANGELOG 2.1.84 |
| MCP output warning | 10,000 tokens | MCP page |
| MCP output max default | 25,000 tokens (configurable via `MAX_MCP_OUTPUT_TOKENS`) | MCP page |
| Auto memory MEMORY.md | 200 lines OR 25KB (whichever smaller) | Memory page + CHANGELOG 2.1.83 |
| CLAUDE.md recommended size | Under 200 lines per file | Memory page |
| Opus 4.6 max output | 64k default, 128k upper bound | CHANGELOG 2.1.77 |
| Opus 4.6 context window | 1M (Max, Team, Enterprise) | CHANGELOG 2.1.75 |
| @import max depth | 5 hops | Memory page |

---

## 10. /context COMMAND OUTPUT CATEGORIZATION

The `/context` command (mentioned in CHANGELOG 2.1.74) "identifies context-heavy tools, memory bloat, and capacity warnings with specific optimization tips." The exact categorization labels shown by `/context` are not documented in the pages scraped, but based on the loading behavior documented:

- CLAUDE.md files would appear as instructions/memory
- Skill descriptions would appear as skill/tool definitions
- MCP tool definitions would appear as tool definitions
- Auto memory would appear as memory

The `/memory` command "lists all CLAUDE.md and rules files loaded in your current session."

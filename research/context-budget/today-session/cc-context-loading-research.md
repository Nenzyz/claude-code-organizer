# Claude Code Context Loading Research

**Date**: 2026-03-26
**Version referenced**: Claude Code v2.1.84 (latest as of research date)

---

## Overview: What Gets Loaded at Session Start

When you start a Claude Code session, the following components are injected into the context window **before you type anything**:

| Category | Typical Tokens (200K model) | Typical Tokens (1M model) | Notes |
|---|---|---|---|
| System prompt | ~3.2k–6.2k | ~3.2k–6.2k | Fixed; CC's personality/behavior instructions |
| System tools | ~11.6k–17.9k | ~11.6k–17.9k | Built-in tool schemas (Read, Write, Bash, Edit, Grep, Glob, etc.) |
| System tools (deferred) | ~7.3k | ~7.3k | Deferred built-in tools (e.g. TodoWrite, WebSearch, NotebookEdit) — name-only stubs |
| MCP tools | 0–49.5k+ | 0–49.5k+ | Depends on connected servers; may be deferred |
| MCP tools (deferred) | 0–5.9k+ | 0–5.9k+ | Name+description stubs for deferred MCP tools |
| Memory files | 0.7k–7.4k+ | 0.7k–7.4k+ | CLAUDE.md files + first 200 lines of MEMORY.md |
| Skills | ~300–1k | ~300–1k | Name+description only (not full SKILL.md content) |
| Custom agents | ~69–1.3k | ~69–1.3k | Agent definitions if any |
| Autocompact buffer | ~33k (16.5%) | ~33k (3.3%) | Reserved, not usable for conversation |
| **Total static overhead** | **~20k–40k+** | **~20k–40k+** | Before any conversation |

---

## Detailed Answers to Specific Questions

### Q1: Does Claude Code load individual memory files (e.g. user_prefs.md) at session start, or only MEMORY.md (the index)?

**Answer: Only the first 200 lines of MEMORY.md are loaded at session start. Individual topic files are NOT loaded.**

From the official docs (https://code.claude.com/docs/en/memory):

> "The first 200 lines of `MEMORY.md` are loaded at the start of every conversation. Content beyond line 200 is not loaded at session start. Claude keeps `MEMORY.md` concise by moving detailed notes into separate topic files."
>
> "Topic files like `debugging.md` or `patterns.md` are not loaded at startup. Claude reads them on demand using its standard file tools when it needs the information."

**Practical implication**: Your MEMORY.md is an **index** that Claude reads at startup. The individual files (like `user_prefs.md`, `debugging.md`, etc.) are **lazy-loaded** — Claude reads them only when it determines it needs the information during a session. This is why keeping MEMORY.md as a concise index with pointers is the optimal pattern.

There is also an **agent prompt** embedded in Claude Code (~218 tokens) that instructs an agent to "determine which memory files to attach" — suggesting there's a lightweight agent step that decides which auto-memory files to pull in beyond the MEMORY.md index.

---

### Q2: For skills, does it load just name+description, or more of SKILL.md?

**Answer: Only the skill `name` and `description` from frontmatter are loaded at startup. The full SKILL.md content loads only when the skill is invoked.**

From the official docs (https://code.claude.com/docs/en/skills):

> "In a regular session, skill descriptions are loaded into context so Claude knows what's available, but full skill content only loads when invoked."

The /context command confirms this empirically. The blog post at jdhodges.com shows 4 skills costing only **333 tokens total** — roughly 83 tokens per skill. This is consistent with loading only name + description, not full SKILL.md content.

**Why 6-204 tokens per skill in /context?** The variance comes from description length. A skill with a one-sentence description might cost ~6 tokens for the name alone (if description is empty/minimal). A skill with a detailed multi-sentence description (like the bundled `/batch` or `/claude-api` skills) can cost up to ~200 tokens. This is still just the description — not the full SKILL.md body.

**The character budget for skill descriptions** scales dynamically at 2% of the context window (with a fallback of 16,000 characters). If you have too many skills, some may be excluded. Run `/context` to check for a warning about excluded skills. You can override with `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var.

**Exception**: Subagents with `skills` field preload full skill content at startup:
> "Subagents with preloaded skills work differently: the full skill content is injected at startup."

Skills with `disable-model-invocation: true` are NOT loaded into context at all (not even the description).

---

### Q3: Are CLAUDE.md and settings.json counted under "System prompt" or "Memory files" in /context?

**Answer: CLAUDE.md files are counted under "Memory files", NOT under "System prompt".**

The /context breakdown shows:
- **System prompt**: Claude Code's built-in personality/behavior instructions (~3.2k–6.2k tokens). This is fixed and you cannot change it.
- **Memory files**: Your CLAUDE.md files (project + user) AND the auto-memory MEMORY.md. Example from jdhodges.com:

```
Memory files: 3.3k tokens
  User   ~/.claude/CLAUDE.md               1.7k
  AutoMem ~/.claude/projects/.../MEMORY.md  1.6k
```

**Important nuance from official docs**: "CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself." This is significant — CLAUDE.md instructions are injected as a user message, which means they have different priority weighting than the actual system prompt.

**settings.json** is NOT loaded as context at all — it's configuration that controls Claude Code's behavior at the application level (permissions, allowed tools, etc.), not text that goes into the context window.

---

### Q4: Does Claude Code load ALL MCP tool schemas at start, or only when the tool is first used (deferred)?

**Answer: It depends on the `ENABLE_TOOL_SEARCH` setting and the total tool size relative to context.**

The behavior has evolved across versions:

| `ENABLE_TOOL_SEARCH` value | Behavior |
|---|---|
| (unset) / `true` | **Default since ~v2.1.7**: Tool search is always on. Tool definitions are **never** loaded into context upfront. Only name+description summaries are present. Full schemas load on-demand via the ToolSearch meta-tool. |
| `auto` | Checks combined token count of all tool definitions. If they exceed **10%** of context, tool search activates (deferred). Otherwise, all schemas load upfront. |
| `auto:N` | Same as `auto` but with custom percentage N. E.g., `auto:5` defers at 5%. |
| `false` | All tool definitions loaded upfront on every turn. |

**How deferred tools work**:
1. At session start, MCP tool schemas are NOT sent as full tool definitions
2. Instead, Claude receives a brief summary: "You can search for tools to interact with Slack, GitHub, and Jira."
3. When Claude needs a tool, it calls the built-in `ToolSearch` meta-tool
4. ToolSearch returns the **full JSON schema** for the 3-5 most relevant matching tools
5. Those tools stay loaded in context for subsequent turns
6. If the conversation is long, unused tools may be unloaded

**The /context output shows two deferred categories**:
- `MCP tools (deferred)`: Deferred MCP server tools — stored as lightweight name+description stubs
- `System tools (deferred)`: Deferred built-in tools (TodoWrite, WebSearch, NotebookEdit, etc.)

The deferred entries represent the **token cost of the stubs**, not the full schemas. The full schemas are only pulled in when accessed via ToolSearch.

**Real-world example** from a bug report: A user with 3 MCP servers and 40+ tools had **49.5k tokens (24.8% of context)** consumed by MCP tools when tool search was NOT properly activating. With tool search enabled, MCP tools showed "loaded on-demand" with minimal token counts.

---

### Q5: What exactly is the "autocompact buffer" (33K) in /context?

**Answer: It is a hardcoded reserved zone (~33K tokens / 16.5% of 200K) that Claude Code sets aside for the auto-compaction process.**

**What it does**:
1. **Working space for compaction** — The summarization process itself needs tokens to operate
2. **Completion buffer** — Allows current tasks to finish before compaction triggers
3. **Response generation space** — Claude needs working memory to reason and construct responses

**How it works**:
- Claude Code monitors context usage continuously
- When usage reaches ~83.5% of the total window (i.e., free space drops to the buffer zone), auto-compaction triggers
- For a 200K window: compaction fires at ~167K tokens of actual usage
- For a 1M window: the buffer is still ~33K, but that's only 3.3% — compaction fires much later

**History**:
- Previously was ~45K tokens (22.5% of 200K)
- Reduced to ~33K in early 2026 (undocumented change, likely v2.1.21)
- The reduction gave users ~12K more usable tokens

**What you can control**:
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` (env var, 1-100): Shifts when compaction fires. E.g., setting it to 90 means compaction at 90% usage instead of 83.5%.
- `autoCompact: false` in settings.json: Disables auto-compaction entirely (risky)
- The buffer size itself is **hardcoded and cannot be changed**

**What it is NOT**:
- It is NOT the same as `CLAUDE_CODE_MAX_OUTPUT_TOKENS` (max response length, default 32K). These are completely separate mechanisms.

---

## Complete /context Breakdown (Reference)

Here is a composite picture from multiple real sessions:

### Session on Opus 4.6, 1M context window:
```
System prompt:           6.2k   (0.6%)
System tools:           11.6k   (1.2%)
MCP tools:               1.2k   (0.1%)
MCP tools (deferred):    5.9k   (0.6%)
System tools (deferred): 7.3k   (0.7%)
Memory files:            3.3k   (0.3%)
Skills:                    333   (0.0%)
Messages:              185.4k  (18.5%)
Free space:            758.9k  (75.9%)
Autocompact buffer:       33k   (3.3%)
```

### Session on Opus 4.6, 200K context window:
```
System prompt:           3.2k   (1.6%)
System tools:           17.9k   (9.0%)
MCP tools:               6.7k   (3.3%)
Memory files:            1.3k   (0.7%)
Skills:                    396   (0.2%)
Messages:              86.8k  (43.4%)
Free space:               51k  (25.3%)
Autocompact buffer:       33k  (16.5%)
```

### Fresh session on Sonnet 4, 200K context:
```
System prompt:           3.2k   (1.6%)
System tools:           11.6k   (5.8%)
Custom agents:             69   (0.0%)
Memory files:             743   (0.4%)
Messages:               1.2k   (0.6%)
Free space:           183.3k  (91.6%)
```

---

## Key Architectural Insights

### Loading Order at Session Start
1. **System prompt** loads first — Claude Code's fixed personality/instructions
2. **System tool schemas** load (or deferred stubs for some built-in tools)
3. **MCP servers connect** and either load full schemas or deferred stubs (depending on ENABLE_TOOL_SEARCH)
4. **CLAUDE.md files** are walked from cwd upward + user-level file. All loaded in full. Injected as a user message (not system prompt).
5. **Auto-memory MEMORY.md** first 200 lines loaded. Individual topic files NOT loaded.
6. **Skill descriptions** loaded for all skills where `disable-model-invocation` is not true. Full content NOT loaded.
7. **Session memory** recalled from previous sessions ("Recalled 3 memories")
8. **.claude/rules/** files without `paths` frontmatter loaded at launch. Path-scoped rules load on-demand when matching files are opened.

### What Survives /compact
- CLAUDE.md files: **YES** — re-read from disk and re-injected fresh
- Auto-memory MEMORY.md: **YES** — re-loaded
- System prompt/tools: **YES** — always present
- Skill descriptions: **YES** — always present
- Conversation history: **SUMMARIZED** — details lost, high-level preserved

### What Gets Lost During Compaction
- Specific variable names, exact error messages
- Nuanced decisions from early in the session
- File paths and detailed debugging state
- Tool output contents

---

## Sources

1. **Official Docs — Memory**: https://code.claude.com/docs/en/memory
2. **Official Docs — Skills**: https://code.claude.com/docs/en/skills (redirected from slash-commands)
3. **Official Docs — Settings**: https://code.claude.com/docs/en/settings
4. **Agent SDK — Tool Search**: https://platform.claude.com/docs/en/agent-sdk/tool-search
5. **JD Hodges — /context Command**: https://www.jdhodges.com/blog/claude-code-context-slash-command-token-usage/
6. **ClaudeFast — Context Buffer Management**: https://claudefa.st/blog/guide/mechanics/context-buffer-management
7. **Piebald-AI — System Prompts Repo**: https://github.com/Piebald-AI/claude-code-system-prompts (6.7K stars, updated within minutes of each CC release)
8. **GitHub Issues**: #23409 (autocompact buffer), #24079 (premature compaction), #19890 (ENABLE_TOOL_SEARCH auto mode), #34126 (per-model thresholds)
9. **BSWEN — Context Management Best Practices**: https://docs.bswen.com/blog/2026-03-12-claude-context-management-best-practices
10. **ClaudeFast — Session Memory**: https://claudefa.st/blog/guide/mechanics/session-memory

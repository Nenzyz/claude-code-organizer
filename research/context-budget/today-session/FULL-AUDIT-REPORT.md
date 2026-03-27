# Context Budget Feature — Full Audit Report

**Date:** 2026-03-26
**Scope:** Complete validation of CCO's Context Budget feature against official docs, /context command, and community research
**Sources:** 5 deep research agents + manual Piebald-AI analysis + own conversation observation
**Verdict:** Architecture correct, 7 accuracy issues found (3 critical)

---

## Overall Assessment

Our Context Budget feature's core concept and architecture are correct:
- Loaded vs Deferred classification ✅ matches /context
- ai-tokenizer as tokenizer ✅ best offline choice (99.79% accuracy)
- Confidence labels (measured vs estimated) ✅ honest labeling
- Context window toggle (200K / 1M) ✅
- MEMORY.md first-200-lines logic ✅
- settings.json excluded from context ✅
- Hooks = zero context cost ✅

But there are **7 accuracy issues** — 3 critical, 4 important.

---

## CRITICAL Issues

### C1. System Overhead Constants Are Wrong

**Current code (server.mjs:295-296):**
```js
const SYSTEM_LOADED = 12500;  // prompt ~6.5K + tools loaded ~6K
const SYSTEM_DEFERRED = 10500;
```

**Actual /context measurements (from multiple sessions):**

| Environment | System Prompt | Tools (loaded) | Tools (deferred) |
|---|---|---|---|
| Opus 4.6, 1M | 6,200 | 11,600 | 7,300 |
| Opus 4.6, 200K | 3,200 | 17,900 | (not shown separately) |
| Sonnet 4, 200K | 3,200 | 11,600 | (not shown separately) |

**Why it's wrong:**
- System prompt varies by model (Opus ~6.2K vs Sonnet ~3.2K)
- System tools loaded = 11,600-17,900 (NOT 6K)
- System tools deferred = 7,300 (NOT 10,500)
- Our `SYSTEM_LOADED = 12500` is an UNDERCOUNT. Actual = 14,800-24,100

**Fix:**
```js
// Use 1M context numbers (conservative - lower bound)
// System prompt ~6.2K + system tools loaded ~11.6K = ~17.8K
const SYSTEM_LOADED = 17800;
// System tools deferred ~7.3K
const SYSTEM_DEFERRED = 7300;
```

Or better: accept contextLimit param and use different constants per model tier.

### C2. Skill Token Counting Is Significantly Low

**Current approach (server.mjs:198-213):**
- Read SKILL.md frontmatter, extract `description` field
- Count `name + description` tokens

**What Claude Code actually injects (TWO separate locations):**

**Location A — Skill tool description (in tools array):**
```xml
<skills_instructions>
When users ask you to perform tasks, check if any of the available skills...
...
</skills_instructions>

<available_skills>
"skill-name": Description text here
"skill-name2": Another description
</available_skills>
```
Base overhead: ~326 tokens (Piebald-AI measured)

**Location B — system-reminder (re-injected on tool calls):**
```xml
<system-reminder>
The following skills are available for use with the Skill tool:

- skill-name: Description text
- skill-name2: Another description
</system-reminder>
```

**We're missing:**
1. Skill tool boilerplate (~326 tokens) — `<skills_instructions>` wrapper
2. system-reminder re-injection of skill listing (~200+ tokens extra copy)
3. Skill invocation usage prompt (~102 tokens)
4. Per-skill formatting overhead (`- ` prefix, `: ` separator)

**Real numbers:**
- /context reports 4 skills = 333 tokens (~83 per skill)
- Our scan: 28 skills = ~978 tokens (~35 per skill) — **58% undercount**

**Critical detail:** Skill budget is **character-based** (2% of context window, 16,000 char fallback), NOT token-based.

**Fix:** Add Skill tool boilerplate constant + simulate actual injection format:
```js
const SKILL_TOOL_BOILERPLATE = 430; // base tool desc + instructions + schema
let skillListText = "";
for (const skill of skills) {
  skillListText += `- ${skill.name}: ${skill.description}\n`;
}
const skillTokens = await countTokens(skillListText);
// Total = boilerplate + measured descriptions
```

### C3. @import Mechanism Not Handled

**server.mjs:214-217:** CLAUDE.md content is read and tokenized directly, without expanding @imports.

**What @import does:**
- `@path/to/file.md` in CLAUDE.md → file content verbatim expanded inline at session start
- Recursive up to 5 hops
- Paths are relative to the importing file
- Content is injected with NO wrapping — just raw text merge

**Impact:** If a CLAUDE.md uses @imports, we undercount by the full size of imported files.

**Fix:** Add recursive import expansion:
```js
async function expandImports(text, basePath, depth = 0) {
  if (depth >= 5) return text;
  const lines = text.split('\n');
  const expanded = [];
  for (const line of lines) {
    const match = line.match(/^@(.+)$/);
    if (match) {
      const importPath = resolve(basePath, match[1].trim());
      try {
        let imported = await readFile(importPath, 'utf-8');
        imported = await expandImports(imported, dirname(importPath), depth + 1);
        expanded.push(imported);
      } catch { expanded.push(line); }
    } else {
      expanded.push(line);
    }
  }
  return expanded.join('\n');
}
```

---

## IMPORTANT Issues

### I1. HTML Comment Stripping Not Done

**Official docs:** "Block-level HTML comments in CLAUDE.md files are stripped before injection."

**We tokenize the raw CLAUDE.md including comments.** This overcounts.

**Fix:** Add one regex before tokenization:
```js
text = text.replace(/<!--[\s\S]*?-->/g, '');
```

Note: Comments inside code blocks should be preserved (but this edge case is minor).

### I2. MCP Per-Server Estimate Variance Too High

**Current (server.mjs:308):** `mcpUniqueCount * 3100`

**Real-world variance (from agent research):**
| MCP Server | Tokens |
|---|---|
| SQLite (4 tools) | 385 |
| Gmail | 2,640 |
| Playwright | 3,442 |
| Jira | ~17,000 |

**3,100 is a reasonable median**, but range is 385-17,000.

**CRITICAL BUG FOUND:** `/context` command **triple-counts MCP tools** due to a hidden system prompt overhead (~313-346 tokens) being counted per-tool instead of once. Blog post: "XcodeBuildMCP directly measured ~14,081 tokens, /context reported ~45,018 tokens — 3x inflation"

**This means our 3,100 per-server estimate may actually be MORE accurate than /context!**

**Additional issue:** We count ALL scanned MCP servers including disabled/failed ones. Claude Code only counts successfully connected, unique-name servers.

**Fix:**
1. Add `disabled` detection (check `"disabled": true` in mcpConfig)
2. Show as range: "~3.1K avg (range: 0.4K-17K depending on tools)"
3. Add note about /context's known 3x inflation bug

### I3. Path-Scoped Rules Miscategorized

**server.mjs:176:** `ALWAYS_LOADED_CATEGORIES = new Set(["skill", "rule", "command", "agent"])`

All rules are classified as "always loaded". But rules with `paths:` frontmatter are **on-demand** (only loaded when Claude reads matching files).

**Fix:** Read rule frontmatter, check for `paths:` field:
```js
if (item.category === "rule") {
  const content = await readFile(item.path, 'utf-8');
  const fm = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
  if (/^paths:/m.test(fm)) {
    deferred.push(entry); // on-demand
  } else {
    loaded.push(entry); // always loaded
  }
}
```

### I4. CLAUDE.md Injection Wrapper Overhead Not Counted

**The actual injection has significant wrapper text:**
```
<system-reminder>
As you answer the user's questions, you can use the following context:
# claudeMd
Codebase and user instructions are shown below. Be sure to adhere to these instructions...

Contents of /path/to/CLAUDE.md (user's private global instructions for all projects):

[CLAUDE.md content]

      IMPORTANT: this context may or may not be relevant...
</system-reminder>
```

**Overhead per session:** ~80-120 tokens (header + per-source headers + disclaimer)
**Per CLAUDE.md source:** ~15-25 tokens (`Contents of [path] ([description]):`)

**Fix:** Add constant for wrapper overhead:
```js
const CLAUDEMD_WRAPPER_OVERHEAD = 100; // <system-reminder> + header + disclaimer
const CLAUDEMD_PER_SOURCE_OVERHEAD = 20; // "Contents of [path] ([desc]):" line
```

---

## Potential Improvements

### A. Show Autocompact Buffer

/context shows "Autocompact buffer: ~33K (16.5%)" — users should know this eats into usable space.

### B. Deferred Tool Listing Overhead

Deferred tools are listed as names in `<system-reminder>`:
```
The following deferred tools are now available via ToolSearch:
AskUserQuestion
CronCreate
...
```
This is ~100-200 tokens depending on tool count. We don't account for this.

### C. Statusline API Integration (Future)

Claude Code has first-party statusline API. We could write a CCO statusline script that dumps REAL-TIME context usage to `/tmp/cco-context-live.json` — turning our "estimate" into "actual".

### D. claudeMdExcludes Support

The `claudeMdExcludes` setting lets users skip specific CLAUDE.md files. We should read this setting and exclude matched files from our count.

---

## What We Got Right ✅

| Aspect | Status |
|---|---|
| Loaded vs Deferred classification | ✅ Correct |
| ai-tokenizer choice | ✅ Best offline option |
| bytes/4 fallback | ✅ ~75-85% accuracy |
| MEMORY.md first-200-lines logic | ✅ Correct |
| Individual memory files excluded | ✅ Correct |
| settings.json excluded from context | ✅ Correct |
| Hooks = zero context cost | ✅ Correct |
| MCP deduplication by unique name | ✅ Correct |
| Context rot warning | ✅ Supported by research |
| 200K / 1M toggle | ✅ Correct |

---

## Fix Priority

| Priority | Issue | Effort | Impact |
|---|---|---|---|
| P0 | C1: System overhead constants | 30 min | All users affected |
| P0 | C2: Skill token counting | 1-2 hr | Users with many skills |
| P1 | C3: @import not handled | 1 hr | Users with @imports undercount |
| P1 | I1: HTML comment stripping | 15 min | Users with comments overcount |
| P1 | I2: MCP disabled filtering | 30 min | Users with disabled servers |
| P2 | I3: Path-scoped rules | 30 min | Users with path rules |
| P2 | I4: CLAUDE.md wrapper overhead | 15 min | ~100 token undercount |

---

## Key Discovery: /context Has a 3x MCP Inflation Bug

The most surprising finding: **Claude Code's own /context command triple-counts MCP tool tokens** because it queries each tool individually, and Anthropic's hidden tool-use system prompt (~313-346 tokens) gets counted per-tool instead of once.

This means:
- /context says MCP tools = 45,018 tokens
- Reality = ~14,081 tokens (3x less)
- **Our offline estimation may actually be MORE accurate than /context for MCP tools**

Source: https://www.async-let.com/posts/claude-code-mcp-token-reporting/

---

## Files to Change

1. **server.mjs** — System overhead constants, skill tokenization, @import expansion, HTML stripping, rule classification, CLAUDE.md wrapper overhead
2. **scanner.mjs** — MCP disabled server detection
3. **app.js** — UI labels for new categories, autocompact buffer display
4. **tokenizer.mjs** — No changes needed (ai-tokenizer is correct choice)

---

## Sources

- Official Claude Code docs: code.claude.com/docs/en/{memory,skills,mcp,features-overview}
- Piebald-AI/claude-code-system-prompts (v2.1.84, 6.7K stars)
- JD Hodges blog: /context command breakdown, MCP server token costs
- async-let.com: MCP token 3x inflation bug deep dive
- ClaudeFast: context buffer management
- GitHub issues: #30103, #31002, #32057, #34363, #27208, #24677
- Lee Han Chung: Claude Agent Skills Deep Dive (decompiled code)
- CHANGELOG v2.1.84, v2.1.83, v2.1.77, v2.1.76, v2.1.75, v2.1.74

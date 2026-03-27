# Exact Token Measurements — Claude Code Overhead

## ClaudeCodeCamp Measurements (2026-03-18)

**Source:** https://www.claudecodecamp.com/p/inside-claude-code-s-system-prompt
**Author:** Abhishek Ray
**Method:** `claude -p --output-format json "What is 2+2?"` — measures actual API payload tokens
**Verified:** Referenced by Piebald-AI, consistent with MITM captures

### Exact Measurements
- From /tmp (no project config): **27,169 tokens** baseline
- From project dir (full setup): **30,919 tokens** baseline
- Delta (project CLAUDE.md + memory + skills + MCP): **3,750 tokens**

### System Prompt Breakdown
- Identity and security: ~100 tokens
- Output and tone: ~320 tokens
- Auto mode (if enabled): +188 tokens
- Git status snapshot: +97 tokens
- **Total system prompt text: 2,300-3,600 tokens** (1-2% of 200K window)

### Tool Definitions Breakdown (23+ built-in tools)
- TodoWrite: 2,161 tokens (largest — structured fields)
- TeammateTool: [large]
- Bash tool description: 1,558 tokens
- Agent creation prompt: 1,110 tokens
- Status line setup: 1,999 tokens
- Read tool: 440 tokens
- Grep tool: 300 tokens
- Edit tool: 246 tokens
- Glob tool: 122 tokens
- **Total tool definitions: ~14,000-17,600 tokens** depending on active tools

### MCP Server Token Costs
- Light MCP server: 1,000-2,000 tokens
- Heavy MCP server (20+ tools like GitHub/Playwright): 10,000+ tokens
- MCP tools are lazy-loaded: name-only placeholders until model requests them

### Skills
- /init skill: 4,618 tokens
- Skills load name + description only (not full content)

### System Reminders
- TodoWrite reminder: 98 tokens
- Token usage reminder: 39 tokens
- USD budget reminder: 42 tokens

## Claude Inspector MITM Capture (2026-03)

**Source:** https://github.com/kangraemin/claude-inspector (MIT license, 6 releases)
**Article:** https://ai-navigate-news.com/articles/dd74924e-56cd-4b8a-94a0-4b45f5f687b9
**Verified:** GitHub repo exists

### Key Findings
- Every request prepends CLAUDE.md + rules + memory as system-reminder: ~12KB overhead
- MCP tools lazy-loaded (schemas only when requested)
- Skills inject full prompt text and persist through session
- Entire conversation history resent on every request
- At 30 turns: ~1MB+ cumulative transfer

### Cumulative Transfer Table
| Turns | Approx. cumulative transfer |
|-------|---------------------------|
| 1     | ~15KB                     |
| 10    | ~200KB                    |
| 30    | ~1MB+                     |

## ClaudeTUI API Sniffer (2026-03)

**Source:** https://dev.to/slima4/sniffing-claude-codes-api-calls-what-your-ide-is-really-sending-5fnl
**Verified:** dev.to article exists

### Key Findings
- System prompt consistently measures ~14K tokens (fixed tax on every call)
- Almost entirely cached after first call ($1.50/M vs $15/M for Opus)
- But still consumes context window space
- Cache ratio shown per request (e.g., "98%c" = 98% cache hit)

## Piebald-AI System Prompt Tracking

**Source:** https://github.com/Piebald-AI/claude-code-system-prompts
**Stars:** 6,700+
**Releases tracked:** 131 (as of v2.1.83)
**Verified:** YES (HTTP 200)

### Key Data
- Tracks: system prompt, 18 built-in tool descriptions, sub-agent prompts (Plan/Explore/Task), utility prompts
- v2.1.74: Main system prompt reduced from 2,896 to 269 tokens (content extracted into separate focused prompts)
- System prompt is 110+ separate instructions, conditionally assembled
- Full extraction available for every release

## Relevance to CCO

These exact measurements give us the baseline numbers for Context Budget estimation. We know precisely how much each component costs.

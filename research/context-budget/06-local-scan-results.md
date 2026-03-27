# Local ~/.claude/ Scan Results — Nicole's Machine

**Date:** 2026-03-25
**Method:** Explore agent scanning all files under ~/.claude/

## Memory Files

### Global (~/.claude/memory/)
- 9 files, 19,412 bytes total (~4,853 tokens)
- Largest: MEMORY.md (1,395 bytes)

### Project memories (5 directories)
- ~/MyGithub: MEMORY.md 6,261 bytes
- CompanyRepo/ai-security-control-plane: MEMORY.md 2,634 bytes
- CompanyRepo/rule-processor: MEMORY.md 1,104 bytes
- CompanyRepo: MEMORY.md 147 bytes
- Documents: MEMORY.md 203 bytes
- **Total project memory: 20,620 bytes** (~5,155 tokens)

**Grand total memory: ~40 KB (~10,000 tokens)**

## Skills
- 28 files across 25+ directories
- Total: 132,688 bytes (~33,000 tokens)

## CLAUDE.md
- Global: 5,660 bytes (~1,415 tokens)
- 6 historical versions in .config-history/

## Settings & Config
- settings.json: 7,118 bytes (~1,780 tokens) — 87 permissions, 18 guards, 44 directories, 3 MCP servers
- .mcp.json: 1,021 bytes (~255 tokens) — 6 MCP server definitions
- settings.local.json: 4,674 bytes (~1,169 tokens)
- **Total config: 12,813 bytes (~3,203 tokens)**

## Plans
- 10 files: 60,970 bytes (~15,243 tokens)

## Sessions (JSONL)
- 672 files, 1,057,691,523 bytes (~1.06 GB)
- 180,418 lines total
- 14 system-reminder injections found in one sampled file

## File-History
- 61,150,386 bytes (~61 MB)
- 13,038 backup entries, 610 subdirectories

## Plugins
- 4,543,918 bytes (~4.5 MB)
- 30+ external integrations cached

## Estimated Pre-Session Load for ~/MyGithub Project

| Component | Tokens |
|-----------|--------|
| Global CLAUDE.md | ~1,415 |
| Global memories (9 files) | ~4,853 |
| Project memories (~MyGithub) | ~5,155 |
| settings.json | ~1,780 |
| .mcp.json | ~255 |
| Skills (28 files, names+desc only) | ~2,000-5,000 |
| System prompt + tools (immutable) | ~21,000 |
| **TOTAL** | **~36,000-39,000** |

Note: Skills load name+description only per ClaudeCodeCamp research, not full content. The ~33K total is if full content loaded.

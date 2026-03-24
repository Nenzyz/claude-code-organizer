# Discord — Anthropic #share-your-projects + MCP Community
# Status: DRAFT
# Note: Post to Anthropic first. Wait 2-3 days before MCP Community (different angle).

---

## Anthropic #share-your-projects

**What I built**: Claude Code Organizer — a dashboard + MCP server that visualizes your full scope hierarchy and lets you drag-and-drop config between scopes

**The problem**: Claude Code silently creates memories, skills, and MCP configs in whatever scope matches your cwd. After a week I found 140 items scattered across encoded-path folders — including a Python skill in global that loaded into every session, and 3 duplicate MCP entries I didn't know about. No native way to see the full tree.

**How it works**:
- Scans `~/.claude/` and renders a scope tree: Global → Workspace → Project
- Shows exactly what Claude loads into context for any directory
- Drag-and-drop to move items between scopes
- Delete stale memories Claude auto-created
- MCP server mode (4 tools: `scan_inventory`, `move_item`, `delete_item`, `list_destinations`)

**Quick start**:
```
npx @mcpware/claude-code-organizer
```

**GitHub**: https://github.com/mcpware/claude-code-organizer
**Demo**: https://raw.githubusercontent.com/mcpware/claude-code-organizer/main/docs/demo.gif

Built with vanilla JS + Node.js. Zero deps. MIT licensed. v0.3 — CS dropout, built this in a day, only tested on Ubuntu (too broke for a Mac). If anything breaks on your setup, open a GitHub issue and I'll fix it same day.

Full writeup: https://dev.to/ithiria894/claude-code-secretly-hoards-140-config-files-behind-your-back-heres-how-to-take-control-2dlb

Has anyone else run into scope contamination? Like skills loading in projects where they don't belong?

---

## MCP Community (post 2-3 days later, MCP-tools angle)

**What I built**: An MCP server that gives Claude self-awareness over its own config files.

**4 tools**: `scan_inventory` (reads all scopes + items), `move_item` (moves between scopes), `delete_item`, `list_destinations` (shows valid move targets).

**Use case**: Claude Code's config is split across a 3-tier scope hierarchy. Items often end up in the wrong scope — a skill meant for one project leaking into global, duplicate MCP entries, stale memories. This lets Claude see the full picture and reorganize things itself.

Also ships with a web dashboard if you prefer visual drag-and-drop.

```
claude mcp add claude-code-organizer -- npx -y @mcpware/claude-code-organizer --mcp
```

https://github.com/mcpware/claude-code-organizer

What other MCP tools are people building for managing Claude Code's own infrastructure (not external APIs)?

# DevHunt — Submission Content
# URL: devhunt.org/submit
# Status: DRAFT
# Note: Free queue is now ~6 MONTHS wait. $49 to skip queue. ~125 launches/week (not 15).
# Note: GitHub login required. DR 62.

---

## One-line description (60 chars max)
Visualize & manage Claude Code's scope config hierarchy

## Longer description
Claude Code stores memories, skills, and MCP configs across a 3-tier scope hierarchy. Items often end up in wrong scopes, contaminating your AI context window.

Claude Code Organizer scans `~/.claude/` and renders the full scope inheritance tree as an interactive web dashboard. Drag-and-drop to move items between scopes. Delete stale entries. Also ships as an MCP server so Claude can manage its own config.

One command, zero install:
```bash
npx @mcpware/claude-code-organizer
```

Zero dependencies. Vanilla JS. MIT licensed. Linux + macOS.

## Founder story / maker comment
I discovered this problem on day 6 of using Claude Code. Opened `~/.claude/` and found 140 items I hadn't knowingly created — including 3 identical MCP server entries across different scopes because I'd added the same server while cd'd into different directories.

Before writing a line of code, I spent an evening searching for existing tools. Found options that handle MCP management or session transcripts, but nothing that shows the scope inheritance hierarchy or lets you move items between scopes. So I built it.

v0.3 built in a day, shipped to npm + MCP registries the same week. If you use Claude Code heavily, this shows you something you probably didn't know was happening.

## GitHub URL
https://github.com/mcpware/claude-code-organizer

## Demo GIF URL
https://raw.githubusercontent.com/mcpware/claude-code-organizer/main/docs/demo.gif

## Tags / categories
Developer Tools, AI Tools, CLI, Open Source

## Website / demo URL
https://github.com/mcpware/claude-code-organizer

---

## Post-launch actions
- Reply to every comment on DevHunt page
- Share DevHunt link on Twitter/Reddit during launch week
- Add "Featured on DevHunt" badge to README after launch

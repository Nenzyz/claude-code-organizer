# Lemmy — programming.dev/c/opensource + selfhosted
# Status: DRAFT
# Account: Register on programming.dev
# Note: Post to programming.dev/c/opensource first.
# Note: selfhosted community lives on lemmy.world/c/selfhosted (NOT programming.dev). Cross-post there via federation.

## Title
Claude Code Organizer — local-only dashboard for managing Claude Code's config files. No cloud, no telemetry, no external calls. (MIT, vanilla JS)

## Body
**Why I built this**: Claude Code (Anthropic's AI coding CLI) stores memories, skills, and MCP server configs in `~/.claude/`. It creates files silently in whatever scope matches your working directory — Global, Workspace, or Project level. After a week of use I had 140+ items scattered across scopes, with some leaking into sessions where they don't belong via scope inheritance. No built-in way to see the full picture.

I searched for existing tools. Found a desktop app (no scope tree), a VS Code extension (editor-locked), a full-stack web app (React + Rust + SQLite). None showed the inheritance hierarchy or had drag-and-drop between scopes.

**What this does**:
- Scans `~/.claude/` recursively — all processing happens locally
- Renders the scope hierarchy as an interactive tree in your browser
- Drag-and-drop to move items between scopes
- Delete entries you don't want
- MCP server mode: Claude can manage its own config via 4 tools

**Privacy / security** (since this audience cares):
- **Zero network calls** — local Node.js server at `localhost:3847`, reads your filesystem, serves a web UI. Nothing else.
- **No telemetry, no analytics, no phone-home** — check the source, it's 800 lines
- **No cloud component** — works fully offline after npm caches the package
- **MIT licensed** — do whatever you want with it

**Running it**:
```bash
npx @mcpware/claude-code-organizer
```
Or globally:
```bash
npm install -g @mcpware/claude-code-organizer
claude-code-organizer
```

**Technical details**: Node.js, vanilla HTML/CSS/JS frontend, zero runtime deps (SortableJS bundled inline), ~800 lines, 6 files.

**What's missing**: No Docker image yet. No Windows support. No config backup/restore. PRs welcome — deliberately small codebase.

**About me**: CS dropout, first open source project. I only have an Ubuntu machine (can't afford a Mac) so everything is tested on Ubuntu only. The file paths under `~/.claude/` might differ slightly on macOS. If you're on a different OS and something breaks, please open a GitHub issue — I'll fix it same day. Cross-platform reports are the single most useful contribution right now.

Source: https://github.com/mcpware/claude-code-organizer
Full writeup: https://dev.to/ithiria894/claude-code-secretly-hoards-140-config-files-behind-your-back-heres-how-to-take-control-2dlb

# r/opensource — Monday 2026-03-27
# Flair: Promotional
# Account: ithiria894
# Status: DRAFT

## Title
I deliberately built this tool with zero dependencies and 800 lines of vanilla JS — wanted it to be the kind of open source project a first-time contributor could actually read

## Body
I built an open source dashboard for managing Claude Code's config files. Claude Code stores memories, skills, and MCP configs in `~/.claude/` across a 3-tier scope hierarchy, and items often end up in the wrong scope — contaminating sessions where they don't belong.

**What I tried first**: Spent an evening searching. Found a desktop app (600+ stars) for config profiles, a VS Code extension with tree view, a full-stack app with AI advisor + database. None showed the scope inheritance tree or had drag-and-drop between scopes.

**Why I built it the way I did**:

- **Zero external deps**: The tool runs via `npx`. If I'd used React + Express, cold start would take 15-20s downloading `node_modules`. With zero deps (SortableJS bundled inline at 8KB), it starts in 2 seconds.

- **800 lines across 6 files**: Every function fits on one screen. You can read the entire codebase in 30 minutes. No abstraction layers, no plugin system — it scans a directory tree, shows it in a browser, lets you move files.

- **Vanilla JS frontend**: No JSX, no virtual DOM, no build step. Open `public/index.html` and you see exactly what the browser renders. Barrier to contribute: can you write HTML and JavaScript?

```bash
npx @mcpware/claude-code-organizer
```

**Caveats**: v0.3, Linux/macOS only. UI is functional but not beautiful. No dark mode, no inline editing yet.

MIT licensed. PRs reviewed same day.

**Full disclosure**: CS dropout, been using Claude Code for one week, this is my first open source project. I only have an Ubuntu machine (too broke for a Mac) so cross-platform testing is limited. If it breaks on macOS or anything else, please open an issue — I'll fix it same day. That's actually the #1 way to help right now: test it on a different OS and report what happens.

If you've wanted to contribute to open source but felt intimidated by massive codebases, this has 6 files and zero build process. Dark mode, better tree rendering, and inline editing are all on the roadmap.

GitHub: https://github.com/mcpware/claude-code-organizer
Full writeup: https://dev.to/ithiria894/claude-code-secretly-hoards-140-config-files-behind-your-back-heres-how-to-take-control-2dlb

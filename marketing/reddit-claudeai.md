# r/Claude (formerly r/ClaudeAI) — Tuesday 2026-03-25
# Flair: Built with Claude
# Account: Think-Investment-557
# Status: DRAFT
# IMPORTANT: Sub renamed to r/Claude. New rules: ONLY tools built FOR Claude allowed.
#   CCO qualifies (it's a Claude Code config manager). Generic "built with Claude" tools do NOT.

## Title
PSA: Claude Code auto-creates memories and dumps them in random scopes. There's no built-in way to see or fix it (open source tool inside)

## Body
Been using Claude Code for a week and found this: every time you say "remember this" or install a tool, Claude silently dumps config files into whatever scope matches your current directory. These files are scattered across encoded-path folders inside `~/.claude/`.

**Why you should care:** Every session, Claude loads all memories + skills + MCP configs from your current scope **plus everything inherited from parent scopes** into your context window.

This means:
- A Python pipeline skill sitting in global scope → gets loaded into your React frontend sessions
- Duplicate MCP server entries → Claude initializes the same server twice
- Archived project memories from 6 months ago → still eating tokens, potentially contradicting your current instructions

You can ask Claude to manage its own config, but there's no command that shows everything across all scopes at once. You're stuck cat-ing files one by one trying to piece it together.

**What I tried first**: I searched for existing tools before building anything. Found a desktop app with 600+ stars — great for config profiles but no scope hierarchy. A VS Code extension with one-click moves — but locked to VS Code. A full-stack app with AI advisor — but requires React + Rust + SQLite. None showed the full inheritance tree or had drag-and-drop between scopes.

So I built **Claude Code Organizer** — a web dashboard + MCP server:

```
npx @mcpware/claude-code-organizer
```

- Scans `~/.claude/`, shows full scope hierarchy tree at a glance
- Drag-and-drop to move memories/skills/MCP between scopes
- Delete stale memories Claude auto-created
- MCP server mode so Claude can programmatically manage its own config

**Caveats:** v0.3, CS dropout who's been using Claude Code for exactly one week. Built this in a day. I've only tested on Ubuntu because that's all I have (too broke for a Mac lol). ~800 lines vanilla JS, UI is rough but works. If anything behaves weird on your OS, please open a GitHub issue — I'll fix it same day.

GitHub: https://github.com/mcpware/claude-code-organizer
Writeup: https://dev.to/ithiria894/claude-code-secretly-hoards-140-config-files-behind-your-back-heres-how-to-take-control-2dlb

**Question: How many scopes do you have? Has Claude ever "forgotten" something you told it to remember because it saved to the wrong scope?**

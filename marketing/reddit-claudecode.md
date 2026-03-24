# r/ClaudeCode — Wednesday 2026-03-25
# Flair: Resource
# Account: Think-Investment-557
# Status: DRAFT

## Title
[Resource] I scanned my ~/.claude/ and mapped the full scope inheritance chain — here's what Claude actually loads into your context per session

## Body
I wanted to understand exactly what Claude Code sees when it starts a session in a given directory. So I wrote a scanner that walks `~/.claude/` and maps every scope.

The inheritance chain most people don't realize exists:

```
Global (~/.claude/)
  └── Workspace (~/.claude/projects/{encoded-parent-path}/)
        └── Project (~/.claude/projects/{encoded-path}/)
```

When you open Claude Code in a project, it loads all three levels into your context window. After one week of use, I had 140+ items — including a Python pipeline skill sitting in global that loaded into my React sessions, and 3 identical MCP server entries because I'd added the same server from different directories.

**What I tried first**: I searched for existing tools. Found a desktop app with 600+ stars — great for config profiles but no scope hierarchy view. A VS Code extension with one-click moves — but locked to VS Code. A full-stack app with AI advisor — but requires React + Rust + SQLite. None showed the inheritance tree or had drag-and-drop between scopes.

**What I built**: Claude Code Organizer — a dashboard + MCP server.

```bash
npx @mcpware/claude-code-organizer
```

Opens at `localhost:3847`. Shows the full scope tree with every memory, skill, and MCP config. Drag items between scopes or delete stale entries.

MCP mode — add to your config and Claude can manage its own scopes:
```json
{
  "mcpServers": {
    "claude-code-organizer": {
      "command": "npx",
      "args": ["-y", "@mcpware/claude-code-organizer", "--mcp"]
    }
  }
}
```

**Caveats**: v0.3, ~800 lines vanilla JS. I've only tested on Ubuntu (too broke for a Mac) so the file paths might have slight differences on macOS. If anything breaks on your system, open a GitHub issue — I fix things same day. No dark mode, no inline editing yet.

GitHub: https://github.com/mcpware/claude-code-organizer
Writeup: https://dev.to/ithiria894/claude-code-secretly-hoards-140-config-files-behind-your-back-heres-how-to-take-control-2dlb

**Try running `ls ~/.claude/projects/` — how many encoded-path directories do you have?**

# Indie Hackers — Show IH
# Tag: Show IH
# Groups: Share Your Project, Show IH, SAAS
# Status: DRAFT
# Note: IH has gating — need posting access before this can go live. Comment on 5-10 posts first.

## Title
I built it in a day but I've spent a week trying to get anyone to notice. Here's what I learned about distribution for niche dev tools.

## Body

**What I built**: [Claude Code Organizer](https://github.com/mcpware/claude-code-organizer) — a web dashboard + MCP server that visualizes Claude Code's config hierarchy and lets you move memories/skills between scopes.

```bash
npx @mcpware/claude-code-organizer
```

**How it works**:
- Scans `~/.claude/` and renders the full scope tree (Global → Workspace → Project)
- Drag-and-drop to move items between scopes
- Delete stale memories Claude auto-created
- MCP server mode so Claude can manage its own config (4 tools)

**The backstory**: Day 6 of using Claude Code, I opened `~/.claude/` and found 140 items I didn't know existed. Searched for existing tools — found a desktop app (600+ stars, no scope tree), a VS Code extension (editor-locked), a full-stack app (React + Rust + SQLite, overkill). None had scope hierarchy + drag-and-drop. Built it in a day.

---

### The part IH actually cares about: distribution

**Week 1 numbers:**

| Channel | Action | Result |
|---------|--------|--------|
| npm + registries | Published to npm, Glama, mcp.so, official registry | 7 GitHub stars total |
| Dev.to | 1,800-word "I built X" article | Published, minimal traction |
| Reddit r/SideProject | Builder story post | A few upvotes |
| Reddit r/Claude (612K) | Couldn't post — karma too low | Blocked |
| Moltbook | AI social network post | Posted via API |

---

### What I learned

**1. Reddit karma is infrastructure, not vanity.**
The sub with my exact users (r/Claude, 612K members) requires posting history. I showed up on launch day with a fresh account. Blocked. Start engaging 3-4 weeks before you need to post.

**2. "Solved a real problem" is necessary but not sufficient.**
The tool works. But most people who have this pain don't know they have it. Distribution = education + placement.

**3. Your addressable market is a subset of a subset.**
r/ClaudeCode has 658K members, but maybe 5% have hit this specific pain. Broad channels (r/webdev, HN) don't care about Claude internals. Niche channels care but match rate per post is low.

**4. One-command framing > feature lists.**
`npx @mcpware/claude-code-organizer` in a title converts better than "web dashboard with scope visualization and drag-and-drop."

**5. Search before building saved me from a false start.**
30 minutes of market research prevented building a duplicate.

---

**About me**: CS dropout. Ubuntu is my only machine (too broke for a Mac). Been using Claude Code for one week. My ADHD found its forever home and I'm not even mad about it. I read every issue, every comment. If you report something, there's a decent chance it's fixed within a couple hours.

**Links**: [GitHub](https://github.com/mcpware/claude-code-organizer) · [Demo GIF](https://raw.githubusercontent.com/mcpware/claude-code-organizer/main/docs/demo.gif) · [Dev.to writeup](https://dev.to/ithiria894/claude-code-secretly-hoards-140-config-files-behind-your-back-heres-how-to-take-control-2dlb)

**Question for IH**: For open source tools in a technical niche — is week 1 supposed to be this quiet? What lever made the difference for your first 50 stars?

# r/vibecoding — Sunday 2026-03-30
# Account: Think-Investment-557
# Status: DRAFT
# Note: 184K members, 256,055%/yr growth. Audience = "just make it work" vibe coders, many non-CS.
#   They LOVE: CS dropout stories, built-in-a-day, no-framework, "I didn't know what I was doing but it works"

## Title
CS dropout, 1 week of Claude Code, day 6 I found 140 mystery config files. So I vibed out a dashboard in one day to fix it.

## Body
I dropped out of CS, mass. Couldn't do the math courses. Found Claude Code last week and honestly it's the first time coding has felt like something I could actually do.

Day 6 I peeked inside `~/.claude/` and found **140 files** I didn't create. Memories, skills, MCP configs — Claude had been silently saving stuff every time I said "remember this" or installed a tool. Scattered across folders with names like `-home-user-projects-my-app/`. I had no idea this was happening.

The worst part: a Python skill I set up for one project was sitting in global scope, so it loaded into **every single session** — including when I was working on completely different stuff. I also found 3 identical MCP server entries because I'd added the same server while cd'd into different directories.

I tried asking Claude to clean it up. Spent 20 minutes going back and forth, cat-ing files one by one. There's no command that shows you everything at once.

So I vibed one out. Took about a day.

```
npx @mcpware/claude-code-organizer
```

Opens a web dashboard at localhost:3847. Shows everything Claude stored about you, organized by scope (Global → Workspace → Project). You can drag stuff between scopes or delete things that shouldn't be there.

The whole thing is ~800 lines of vanilla JS. No React, no framework, no build step. I didn't know how to set up a React project anyway so I just wrote plain HTML and JavaScript and it works.

**Fair warning**: I only have an Ubuntu machine (too broke for a Mac lol) so I've only tested it on Ubuntu. If you're on macOS or anything else and something breaks, please open a GitHub issue — I'll fix it same day. Literally same day, I have nothing else going on except this.

GitHub: https://github.com/mcpware/claude-code-organizer
Full writeup: https://dev.to/ithiria894/claude-code-secretly-hoards-140-config-files-behind-your-back-heres-how-to-take-control-2dlb

**Anyone else been vibe coding with Claude Code? How do you keep your config from turning into a mess?**

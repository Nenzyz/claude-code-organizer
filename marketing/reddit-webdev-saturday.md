# r/webdev — Saturday 2026-03-29 (Showoff Saturday ONLY)
# Tag: [Showoff Saturday]
# Account: Think-Investment-557
# Status: DRAFT
# IMPORTANT: ONLY post on Saturday 10 AM-12 PM EST. Any other day = removed.

## Title
[Showoff Saturday] No React, no Express, no build step — I built a drag-and-drop web dashboard in vanilla JS with raw http.createServer

## Body
I wanted to share the tech decisions, not just the product. Curious what this sub thinks.

**The tool**: A web dashboard that scans Claude Code's config directory and lets you reorganize files between scopes with drag-and-drop. Not important for this post — what's interesting is HOW it's built.

**The stack**:

| Layer | Choice | Why |
|-------|--------|-----|
| Server | `http.createServer` (no Express) | 4 endpoints. Express adds 57 deps for a router I don't need |
| Frontend | Vanilla HTML/CSS/JS | Single `index.html`, no transpilation, no virtual DOM |
| Drag-and-drop | SortableJS (14KB, bundled inline) | Only external lib. Inlined to avoid `node_modules` entirely |
| Styling | Plain CSS | CSS Grid for the scope tree layout, no preprocessor |
| Build | None | What you see in `public/` is what the browser loads |

**Total**: ~800 lines across 6 files. `npx` cold start under 2 seconds because there's nothing to download.

**Specific patterns I used**:

1. **Template literals as components** — each scope card is a function that returns an HTML string. No virtual DOM diffing, just `innerHTML` replacement. It's a dashboard you open once, not a real-time app — reconciliation would be overkill.

2. **Event delegation over individual listeners** — one click handler on the container, check `e.target.dataset.action`. Avoids listener cleanup when re-rendering.

3. **SortableJS `onEnd` for cross-list moves** — SortableJS handles the drag UX, `onEnd` fires an API call (`POST /api/move`), then I re-fetch and re-render the whole tree. Crude but reliable for this scale.

4. **Confirmation modal in pure CSS** — overlay + `position: fixed`, toggled with a class. No dialog polyfill needed.

**What I'd do differently**: The tree rendering is O(n) re-render on every change. For 140 items it's instant, but if someone has 1,000+ it'll jank. A proper virtual list or incremental update would fix it — but I'd rather ship than optimize for an edge case.

**Honest UX issues**: No dark mode. Drag zones are visually unclear. Mobile layout is broken. Tree nodes don't collapse. All PRs welcome — the codebase is genuinely readable.

**Context**: CS dropout, first open source project, built in a day. I only have an Ubuntu machine (too broke for a Mac lol) so I genuinely don't know how this renders on macOS Safari or Windows. If you try it on a different OS and something looks off, I'd love to know — open an issue and I'll fix it same day.

GitHub: https://github.com/mcpware/claude-code-organizer
Demo: https://raw.githubusercontent.com/mcpware/claude-code-organizer/main/docs/demo.gif
Full writeup: https://dev.to/ithiria894/claude-code-secretly-hoards-140-config-files-behind-your-back-heres-how-to-take-control-2dlb

**Would you have reached for a framework here? Or is vanilla JS the right call for a tool this small?**

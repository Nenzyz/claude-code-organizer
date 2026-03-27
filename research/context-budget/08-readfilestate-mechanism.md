# readFileState Mechanism — Claude Code Internal File Tracking

**Sources:**
- Thread on Chinese forum (reverse engineering v2.1.71)
- GitHub issues #4464, #16021, #17601, #21214, #21693, #33861
- ClaudeCodeCamp analysis
- Claude Inspector MITM captures

## How readFileState Works

### The Map
```
readFileState = Map<filePath, { content, timestamp, offset, limit }>
```

### Two places that call .set():

| Location | Trigger | Value Set |
|----------|---------|-----------|
| WL8 (memory/CLAUDE.md load) | Loading nested memory files | { content, timestamp: Date.now(), offset, limit } |
| Write/Edit tool success | After Claude writes a file | { content, timestamp: oS(filePath), offset, limit } |

**Key difference:** memory load uses `Date.now()` (current time), Write/Edit uses `oS(filePath)` (file's actual mtime).

### Stale Check (jqY function) — runs every user message

```
for (each file in readFileState) {
  // 1. Skip partial reads (have offset/limit)
  if (w.offset !== undefined || w.limit !== undefined) skip;

  // 2. Compare: file's current mtime > stored timestamp?
  if (oS(filePath) <= w.timestamp) skip;  // no change → skip

  // 3. File changed → re-read content
  currentContent = Read(filePath);

  // 4. Compute diff
  diff = Ak7(w.content, currentContent);

  // 5. Empty diff → skip (mtime changed but content same)
  if (diff === '') skip;

  // 6. Has diff → inject as system-reminder
  return { type: 'edited_text_file', filename, snippet: diff };
}
```

### The Resume Bug

When you close Claude Code and `--resume` a session:
1. readFileState is **in-memory only** — gone when you close
2. C26 function rebuilds it from JSONL conversation history
3. It scans for assistant's tool_use entries (Read without offset/limit, Write with content)
4. Reconstructed entries have **offset: undefined, limit: undefined**
5. Max 10 files reconstructed (meY = 10)
6. ALL reconstructed files are marked for tracking
7. Next user message → stale check runs → all 10 files get re-read and potentially injected

### Why This Causes Massive Token Waste

- After resume: up to 10 files' **complete content** injected as system-reminders
- If file paths don't match exactly (e.g., symlinks, case differences), tracking table never updates → injection repeats EVERY message
- Agent SDK: every send_message is effectively a resume → rebuilds table → injects every time

### Injection Format
```xml
<system-reminder>
Note: /path/to/file.py was modified, either by the user or by a linter.
This change was intentional, so make sure to take it into account as you
proceed (ie. don't revert it unless the user asks you to).
Don't tell the user this, since they are already aware.
Here are the relevant changes (shown with line numbers):
[FULL DIFF CONTENT]
</system-reminder>
```

## Relevance to CCO

CCO currently manages memories, skills, MCP configs — the "static" context. The readFileState mechanism represents "dynamic" context that we could warn users about. A Context Budget feature could:
1. Show static context cost (what we already scan)
2. Warn about dynamic context risks (file tracking, rule re-injection)
3. Estimate total pre-session overhead

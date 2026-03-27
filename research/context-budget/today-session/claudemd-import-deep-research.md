

I'll research all these aspects systematically. Let me start by checking the Piebald-AI repo and searching for relevant information.
Excellent. Now let me fetch the actual system prompt format from Piebald-AI to see the exact injection wrapping.
Now let me look at the key files - the README for the injection format, and search for how CLAUDE.md is wrapped.
Now let me look at the actual injection format. The key is understanding how CLAUDE.md content appears in the conversation. Let me look at the README section about how prompts are structured, and check the GitHub issues about @import.
This is very valuable. Now let me get more specific details about the exact wrapping format and check those GitHub issues.
Now let me look at the actual current conversation to verify the format — I can see it in my own system-reminder in this conversation. Let me also check for more details about how rules files and multiple CLAUDE.md files are separated.
Now let me check the actual Piebald-AI system prompt files that show the exact template format for how CLAUDE.md is injected.
Now let me read the key template files that show the wrapping, and also look at the README extraction section.
Now I have a very clear picture. Let me also look at the extraction section and verify one more critical thing — I can actually see the exact format in my OWN conversation right now. Let me also check the README's extraction method.
I now have comprehensive information from multiple sources. Let me also check one more thing — the official docs page specifically about the settings to confirm the claudeMdExcludes behavior.
The settings page doesn't mention it directly. The memory docs page had the details. I have enough information now. Let me compile the comprehensive research findings.

---

好，我做完哂全面嘅 research。以下係所有搵到嘅結果：

---

## 1. @import 機制：`@path/to/file` 點樣運作

**語法：** 喺 CLAUDE.md 入面用 `@path/to/file.md` 引用其他檔案。

**路徑解析：**
- 相對路徑係 **相對於包含 import 嗰個檔案**，唔係 working directory
- 支援 `~` 展開 home directory（例如 `@~/.claude/my-project-instructions.md`）
- 支援絕對同相對路徑

**內容注入方式：**
- 內容係 **verbatim 直接插入**，無任何 wrapping、header、或 metadata
- 唔會自動調整 heading level — 如果 imported 檔案有 `# Title`，佢會保持 `#` level，唔會因為 parent 嘅 heading 而降級
- Import 嘅內容同 inline text 完全 merge 埋一齊

**遞歸限制：** 最多 **5 層深度**（five hops）。Import 嘅檔案可以遞歸 import 其他檔案。

**安全機制：** 第一次喺 project 遇到 external imports 時，會 show 一個 approval dialog。拒絕後就唔會再問。

**關鍵發現 for Context Budget：** `@import` 嘅內容係 **session start 時展開**，然後同 CLAUDE.md 一齊注入。所以你需要計埋所有 imported 檔案嘅 token count。

Source: [Official docs - Memory](https://code.claude.com/docs/en/memory), [Issue #6321](https://github.com/anthropics/claude-code/issues/6321), [Issue #1045](https://github.com/anthropics/claude-code/issues/1045)

---

## 2. HTML Comment Stripping

**官方 docs 明確寫：**
> Block-level HTML comments (`<!-- maintainer notes -->`) in CLAUDE.md files are stripped before the content is injected into Claude's context. Use them to leave notes for human maintainers without spending context tokens on them.

**所以 `<!-- comments -->` 係 strip 咗之後先注入，唔會消耗 context token。**

但有 caveats：
- Code block 入面嘅 comments 會保留
- 用 Read tool 直接打開 CLAUDE.md 時，comments 仍然可見

**Context Budget 影響：** 你嘅 token counting 應該 **strip HTML comments 先再計**，噉先至反映真正注入嘅 token 數。

Source: [Official docs - Memory](https://code.claude.com/docs/en/memory)

---

## 3. `.claude/rules/` 檔案點樣載入

**Discovery：** 所有 `.md` 檔案會被 recursively 搵出嚟，可以用 subdirectory 組織（例如 `frontend/`, `backend/`）。

**載入時機：**
- **無 `paths` frontmatter** 嘅 rules → session start 時載入，同 `.claude/CLAUDE.md` 同一 priority
- **有 `paths` frontmatter** 嘅 rules → 只喺 Claude 讀到 matching 嘅檔案時先載入

**注入格式：** 根據 Piebald-AI 提取嘅 system prompts 同我自己呢個 conversation 可見，rules 同 CLAUDE.md 內容都係用 `<system-reminder>` tag 包住注入。

**User-level rules** (`~/.claude/rules/`) 先載入，project rules 後載入（project rules 有更高 priority）。

**Symlink 支援：** `.claude/rules/` 支援 symlinks，circular symlinks 會被 detect 同 handle gracefully。

Source: [Official docs - Memory](https://code.claude.com/docs/en/memory), [Piebald-AI repo](https://github.com/Piebald-AI/claude-code-system-prompts)

---

## 4. 多個 CLAUDE.md 檔案點樣合併 — 實際注入格式

呢個係最關鍵嘅發現。從我 **自己呢個 conversation 嘅 system-reminder** 同 Piebald-AI 提取嘅 templates，我可以確認實際格式：

### 實際 wrapping 格式

```xml
<system-reminder>
As you answer the user's questions, you can use the following context:
# claudeMd
Codebase and user instructions are shown below. Be sure to adhere to these instructions. IMPORTANT: These instructions OVERRIDE any default behavior and you MUST follow them exactly as written.

Contents of /path/to/.claude/CLAUDE.md (user's private global instructions for all projects):

[CLAUDE.md 內容]

Contents of /path/to/project/.claude/CLAUDE.md (project instructions):

[另一個 CLAUDE.md 內容]

      IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.
</system-reminder>
```

### 分隔方式

每個 CLAUDE.md 來源用呢個格式分隔：
```
Contents of [absolute path] ([type description]):

[content]
```

其中 type description 包括：
- `user's private global instructions for all projects`
- `project instructions` (推測)
- `user's auto-memory, persists across conversations`

### Token overhead 拆解

**固定 overhead（wrapper text）：**
- Opening: `As you answer the user's questions, you can use the following context:\n# claudeMd\nCodebase and user instructions are shown below...` ≈ ~50 tokens
- 每個 CLAUDE.md 來源嘅 header: `Contents of [path] ([description]):\n\n` ≈ ~15-25 tokens per source
- 尾部 disclaimer: `IMPORTANT: this context may or may not be relevant...` ≈ ~25 tokens
- `<system-reminder>` tags 本身 ≈ ~5 tokens

**所以每個 session 嘅 CLAUDE.md injection overhead 大約 ~80-120 tokens**，視乎幾多個 CLAUDE.md sources。

Source: 我自己呢個 conversation 嘅 system-reminder（直接可見）, [Issue #7571](https://github.com/anthropics/claude-code/issues/7571), [Piebald-AI system-reminder-memory-file-contents.md template](https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/system-reminder-memory-file-contents.md)

---

## 5. `claudeMd` Content Block 格式

**CLAUDE.md 唔係放喺 system prompt，係放喺 user message。** 官方 docs 明確寫：

> CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself.

所以整個結構係：
1. **System prompt** = Claude Code 嘅 core instructions（shared across all users, enables prompt caching）
2. **第一個 user message** = 包含 `<system-reminder>` tag 嘅 CLAUDE.md 內容
3. 之後先係用戶嘅 actual message

`# claudeMd` 係呢個 content block 嘅 section header。

Source: [Official docs - Memory](https://code.claude.com/docs/en/memory), [Issue #7571](https://github.com/anthropics/claude-code/issues/7571)

---

## 6. Edge Cases

### Symlinks
- `.claude/rules/` 完全支援 symlinks
- Circular symlinks 會被 detect 同 gracefully handle
- Piebald-AI repo 提到 v1.0.61 changelog 有 "resolution of settings files paths that are symlinks"

### 大型 CLAUDE.md 檔案
- **無硬性 size limit**，但官方建議 **每個 CLAUDE.md 控制喺 200 行以內**
- 超過 200 行會消耗更多 context 同 reduce adherence
- Auto memory 嘅 MEMORY.md 有 200 行/25KB 嘅 hard limit，但 **CLAUDE.md 會完整載入**（"CLAUDE.md files are loaded in full regardless of length"）

### Circular @imports
- 最大深度 **5 hops** — 超過就停
- 官方 docs 無明確提到 circular import detection mechanism，但 depth limit 自然會防止 infinite loop
- Issue #1045 討論中無人報告過 circular import crash

### Sub-agent @imports
- **唔正式支援。** Issue #5914 表明 sub-agent markdown 入面嘅 `@imports` 實際上依賴 Read tool 嚟讀，唔係 native import
- 呢個 issue 已經被 close 咗 (NOT_PLANNED)

Source: [Official docs - Memory](https://code.claude.com/docs/en/memory), [Issue #1045](https://github.com/anthropics/claude-code/issues/1045), [Issue #5914](https://github.com/anthropics/claude-code/issues/5914)

---

## 7. `claudeMdExcludes` 同 Token Counting

**行為：** `claudeMdExcludes` 接受 glob patterns，match 嘅 CLAUDE.md 檔案 **唔會被載入**。

```json
{
  "claudeMdExcludes": [
    "**/monorepo/CLAUDE.md",
    "/home/user/monorepo/other-team/.claude/rules/**"
  ]
}
```

**Token counting 影響：** 被 exclude 嘅檔案 **完全唔會注入 context**，所以唔會消耗 token。Managed policy CLAUDE.md **唔可以** 被 exclude。

**可以設置嘅 layer：** user, project, local, 或 managed policy。Arrays across layers 會 merge。

Source: [Official docs - Memory](https://code.claude.com/docs/en/memory)

---

## Context Budget Feature 嘅具體建議

Based on 以上研究，你哋嘅 Context Budget feature 需要 account for：

| 項目 | 點做 |
|---|---|
| **@imports** | 遞歸展開所有 `@path` references（最多 5 層），計埋所有 imported 檔案嘅 tokens |
| **HTML comments** | Strip `<!-- ... -->` 先再計 token（code block 入面嘅保留） |
| **Injection wrapper overhead** | 加 ~80-120 tokens fixed overhead（`<system-reminder>` tag + `# claudeMd` header + disclaimer + per-source headers） |
| **Per-source header** | 每個 CLAUDE.md 來源加 ~15-25 tokens（`Contents of [path] ([desc]):` line） |
| **`claudeMdExcludes`** | 排除 matched files 唔計 |
| **`.claude/rules/`** | 無 `paths` frontmatter → always loaded, 有 `paths` → conditional（可能唔 count 或 separate count） |
| **Auto memory** | `MEMORY.md` 最多 200 行 / 25KB，有自己嘅 `<system-reminder>` wrapper |

Piebald-AI repo 已經 clone 咗去 `/home/nicole/MyGithub/notable-repos/claude-code-system-prompts/`，入面有所有 system prompt templates 嘅 token counts 做 reference。

---

今日學到 CLAUDE.md injection format 嘅具體 overhead 數字同 wrapping structure，要唔要我 update 返 project docs？
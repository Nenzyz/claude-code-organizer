## 1. `/context` 顯示嘅確切分類 (Categories)

根據多個真實 output 同 GitHub issue #36046 入面嘅 JSON schema，`/context` 報告以下分類：

| Category | 描述 |
|---|---|
| **System prompt** | Claude Code 自身嘅 internal instructions |
| **System tools** | 內建工具 (Read, Edit, Bash, Grep, Glob, Write, Agent, Skill, ToolSearch 等) |
| **MCP tools** | 已連接 MCP server 嘅 tool definitions (loaded) |
| **MCP tools (deferred)** | 被推遲載入嘅 MCP tool definitions (僅 name，唔佔 active context) |
| **System tools (deferred)** | 被推遲載入嘅內建工具 (v2.1.69 後出現) |
| **Custom agents** | `.claude/agents/` 入面定義嘅自訂 agents |
| **Memory files** | `CLAUDE.md` (project + global) + `MEMORY.md` (auto memory，前 200 行或 25KB) |
| **Skills** | 已註冊嘅 skill descriptions（輕量，full content 只係 invoke 先載入） |
| **Messages** | 你嘅對話記錄：prompts、responses、tool results |
| **Free space** | 剩餘可用 tokens |
| **Autocompact buffer** | 保留俾 auto-compaction 用嘅空間 (~33k tokens / ~16.5%) |

**注意**：唔係每個 session 都會顯示所有分類。冇 MCP server 就冇 MCP tools 行；冇 custom agents 就冇嗰行。

---

## 2. 真實 Token 數字（來自多個 verified output）

### Output 例子 A — Opus 4.6，1M context window (from jdhodges.com)

```
Context Usage
claude-opus-4-6 · 200.2k/1,000k tokens (20%)

Category              Tokens      Percentage
System prompt          6.2k        0.6%
System tools          11.6k        1.2%
MCP tools              1.2k        0.1%
MCP tools (deferred)   5.9k        0.6%
System tools (deferred) 7.3k       0.7%
Memory files           3.3k        0.3%
Skills                  333        0.0%
Messages             185.4k       18.5%
Free space           758.9k       75.9%
Autocompact buffer     33k         3.3%
```

### Output 例子 B — Opus 4.5，200k context window (from wmedia.es)

```
Context Usage
claude-opus-4-5-20251101 · 51k/200k tokens (26%)

System prompt:     2.6k tokens  (1.3%)
System tools:     17.6k tokens  (8.8%)
MCP tools:          907 tokens  (0.5%)
Custom agents:      935 tokens  (0.5%)
Memory files:       302 tokens  (0.2%)
Skills:              61 tokens  (0.0%)
Messages:         30.5k tokens (15.3%)
Free space:        114k        (57.0%)
Autocompact buffer: 33k tokens (16.5%)
```

### Output 例子 C — Opus 4.5，200k (from claudefast.com buffer article)

```
claude-opus-4-5-20251101 · 76k/200k tokens (38%)

System prompt:   2.7k tokens (1.3%)
System tools:   16.8k tokens (8.4%)
Custom agents:   1.3k tokens (0.7%)
Memory files:    7.4k tokens (3.7%)
Skills:          1.0k tokens (0.5%)
Messages:        9.6k tokens (4.8%)
Free space:      118k        (58.9%)
Autocompact buffer: 33.0k tokens (16.5%)
```

### 觀察到嘅 token 範圍

| Category | 典型範圍 (200k window) | 備註 |
|---|---|---|
| System prompt | 2.6k - 6.2k | 固定，你改唔到 |
| System tools | 8.1k - 17.6k | v2.1.72 後約 8-12k（部分 deferred） |
| MCP tools | 0 - 39.8k+ | 視乎你裝幾多 MCP server |
| Custom agents | 0 - 9.7k | 視乎定義幾多 agents |
| Memory files | 0.3k - 7.4k+ | 視乎 CLAUDE.md 大小 |
| Skills | 61 - 3.5k | 輕量，只載入 descriptions |
| Autocompact buffer | ~33k (固定) | 之前係 ~45k，2026年初減到 ~33k |

---

## 3. Loaded vs Deferred 點計算

### Token 計算邏輯（從 reverse-engineered source code，codelynx.dev）

`/context` 用嘅係 Anthropic API 回傳嘅 **cumulative usage**，唔係自己數 token：

```typescript
total_context = input_tokens + cache_read_input_tokens + cache_creation_input_tokens
percentage = (total_context / maxContextTokens) * 100
```

- **`input_tokens`**：正常送去 Claude 嘅 tokens
- **`cache_read_input_tokens`**：從 cache 讀嘅 tokens（平 90%，但仍佔 context）
- **`cache_creation_input_tokens`**：寫入 cache 嘅 tokens（貴 25%，都佔 context）

三種 token 全部計入 context window 使用量。Cache 只影響錢，唔影響 context 空間。

### Loaded vs Deferred 嘅分別

**Loaded tools**：完整 JSON schema 喺每個 API request 都送去 Claude。每個 tool 佔約 200-900 tokens。

**Deferred tools**：只有 tool name 出現喺 `<available-deferred-tools>` list 入面。要用嘅時候，Claude 先透過 ToolSearch 拉取完整 schema。

`/context` 會分開報告：
- `System tools: X tokens` — loaded 咗嘅
- `System tools (deferred): Y tokens` — 已 defer 嘅（呢啲 token 唔佔 active context）
- `MCP tools: X tokens` — loaded 咗嘅  
- `MCP tools (deferred): Y tokens` — 已 defer 嘅

---

## 4. ToolSearch 機制完整解釋

### 歷史演進

| Version | 變化 |
|---|---|
| **2.0.70** | MCPSearch 引入，只用於 MCP tools |
| **2.1.7** | MCP tool search auto mode 預設開啟 |
| **2.1.14** | MCPSearch 改名做 ToolSearch |
| **2.1.31** | 加入 `select:` 語法，可以直接載入指定 tools |
| **2.1.69** | **所有** built-in system tools 都 defer 到 ToolSearch（System tools 跌到 ~968 tokens） |
| **2.1.72** | 部分回退：常用工具 (Read, Edit, Write, Bash, Glob, Grep, Agent, Skill, ToolSearch) 重新 pre-load；System tools 回到 ~8.1k |

### 運作流程

```
Session 開始
  → Claude 收到: tools=[ToolSearch] + <available-deferred-tools> name list
  → Claude 讀 prompt，判斷需要咩工具
  → Claude call ToolSearch: "+chrome-devtools" 或 "select:Read,Edit,Grep"
  → ToolSearch 從 candidate pool 返回 3-5 個 matching tools (~3k tokens)
  → Orchestration layer 更新 loaded tool set
  → Claude 可以開始用呢啲 tools
  → 之後需要更多 tools → 再 call ToolSearch
```

### 觸發條件

- **自動觸發**：當 MCP tool descriptions 超過 context window 嘅 **10%**（預設）
- **可設定**：`ENABLE_TOOL_SEARCH=auto:5` 將 threshold 降到 5%
- **強制關閉**：`ENABLE_TOOL_SEARCH=false` 或者喺 settings deny ToolSearch：
  ```json
  { "permissions": { "deny": ["ToolSearch"] } }
  ```

### 節省效果

| 資源 | Before ToolSearch | After ToolSearch |
|---|---|---|
| MCP tools (7+ servers) | 39.8k tokens (19.9%) | ~5k tokens (2.5%) |
| System tools | ~14-16k tokens | ~968 tokens (全 defer) 或 ~8.1k (v2.1.72 部分 pre-load) |
| Available context | 92k tokens | 195k tokens |

---

## 5. v2.1.74 嘅 Optimization Tips（新增功能）

根據 GitHub release notes (`/home/nicole` 可以 `npm view @anthropic-ai/claude-code` 確認)：

> **Added actionable suggestions to `/context` command** — identifies context-heavy tools, memory bloat, and capacity warnings with specific optimization tips

即係話，v2.1.74 起，`/context` 唔再只係顯示 numbers，仲會主動建議你點優化：

1. **Context-heavy tools 警告**：如果某個 MCP server 佔太多 tokens，會話你知
2. **Memory bloat 提示**：如果 CLAUDE.md / memory files 過大，建議你 trim
3. **Capacity warnings**：如果接近 compaction trigger，提醒你 run `/compact`
4. **具體 optimization tips**：例如斷開唔用嘅 MCP servers、將大文件移去 skills 等

---

## 6. 200K vs 1M Context Window 嘅處理

### 200K window (預設)

- Autocompact buffer: ~33k tokens (16.5%)
- Compaction trigger: ~83.5% usage (~167k tokens)
- 實際可用空間: ~167k tokens

### 1M window (`sonnet[1m]` 或 `opus[1m]`)

- `/context` 會顯示 `X/1,000k tokens`
- Autocompact buffer 仍然係 33k tokens，但佔比只有 3.3%（而唔係 16.5%）
- Free space 大幅增加
- 例子 A 入面嘅 session：758.9k free out of 1M

**關鍵區別**：1M window 上面，33k buffer 嘅相對影響好細。200k 上面佢佔 16.5%，1M 上面只佔 3.3%。

### 百分比計算

```
percentage = totalTokens / maxContextTokens * 100
```

`maxContextTokens` 會根據你用嘅 model 同 context tier 變：
- Sonnet 4.5 / Opus 4.5 預設 = 200,000
- `sonnet[1m]` / `opus[1m]` = 1,000,000

---

## 7. GitHub Issue #36046 — statusLine JSON 入面要 category breakdown

呢個 issue 要求將 `/context` 嘅 per-category breakdown 暴露到 `statusLine.command` 嘅 JSON input：

```json
{
  "context_window": {
    "categories": {
      "system_prompt": 6600,
      "system_tools": 9100,
      "mcp_tools": 341,
      "custom_agents": 3000,
      "memory_files": 3700,
      "skills": 3500,
      "messages": 51300,
      "autocompact_buffer": 33000
    }
  }
}
```

目前被 close 做 duplicate of #17728。即係話 per-category breakdown **暫時只有 `/context` command 入面有**，statusLine JSON 只有 aggregate numbers (`input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`)。

---

## CCO 驗證要注意嘅重點

如果你想 CCO 嘅 Context Budget feature match `/context` 嘅數字：

1. **Token 來源**：用 API response 嘅 `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`，唔好自己 tokenize
2. **Autocompact buffer**：硬編碼 ~33k tokens（2026年初後）
3. **Deferred vs loaded**：分開顯示。Deferred tools 唔佔 active context 但 `/context` 仍然報告佢哋嘅 token count
4. **Percentage 計算**：用 `maxContextTokens` 做分母（200k 或 1M，視乎 model）
5. **Categories 冇標準 API**：`/context` 嘅 category breakdown 係 Claude Code 內部計算嘅，唔係 API 返回嘅。佢哋應該係用 system prompt 嘅 known text 去估算每個 category 嘅大小

---

### Sources

- [Claude Code /context Command: See Where Your Tokens Go (jdhodges.com)](https://www.jdhodges.com/blog/claude-code-context-slash-command-token-usage/)
- [Claude Code Context Window: Track Token Usage with /context (wmedia.es)](https://wmedia.es/en/tips/claude-code-context-command-token-usage)
- [The /context Command: X-Ray Vision for Your Tokens (dev.to)](https://dev.to/rajeshroyal/the-context-command-x-ray-vision-for-your-tokens-4n03)
- [Claude Code /context Visualizes Context Window (vibesparking.com)](https://www.vibesparking.com/en/blog/ai/claude-code/commands/2025-08-21-context-claude-code-context-tokens-visualizer/)
- [How Claude Code ToolSearch Works (wengjialin.com)](https://wengjialin.com/blog/claude-code-toolsearch/)
- [Built-in system tools now deferred behind ToolSearch — GitHub Issue #31002](https://github.com/anthropics/claude-code/issues/31002)
- [Expose context category breakdown in statusLine JSON — GitHub Issue #36046](https://github.com/anthropics/claude-code/issues/36046)
- [v2.1.74 Release Notes (GitHub)](https://github.com/anthropics/claude-code/releases/tag/v2.1.74)
- [MCP Tool Search: Save 95% Context (claudefast.com)](https://claudefa.st/blog/tools/mcp-extensions/mcp-tool-search)
- [Claude Code Context Buffer: The 33K-45K Token Problem (claudefast.com)](https://claudefa.st/blog/guide/mechanics/context-buffer-management)
- [How to Calculate Your Claude Code Context Usage (codelynx.dev)](https://codelynx.dev/posts/calculate-claude-code-context)
- [How Claude Code works — Official Docs](https://code.claude.com/docs/en/how-claude-code-works)
- [Tool search tool — Claude API Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)

---

今日學到嘅嘢：`/context` 嘅 per-category breakdown 暫時冇 API 暴露（GitHub #36046 被 close 做 duplicate），只有 aggregate token counts 可以從 statusLine JSON 攞到。如果 CCO 要 replicate exact categories，需要自己估算每個 component 嘅 token size。要唔要我 update 返 project docs？
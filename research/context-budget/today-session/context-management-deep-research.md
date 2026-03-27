

I'll research Claude Code's internal context window management systematically. Let me start by searching multiple sources in parallel.
Now let me get the most recent Piebald system prompt data and check the specific numbers around MCP per-server overhead.
This is a critical finding - the `/context` command double-counts! Let me get one more piece of data.
I have enough data now. Let me compile the comprehensive research report.

---

好，我做完晒 research，以下係完整嘅分析報告。資料來源跨越 GitHub issues、Piebald-AI system prompt tracking、社區 blog posts、同 Anthropic 官方文檔。

---

## 1. Compaction 幾時觸發？Threshold 係幾多？

**當前行為 (v2.1.84, March 2026)：**

- **API 層面：** Auto-compaction 喺 input tokens 去到你 effective context window 嘅 ~98% 時觸發
- **Claude Code 層面：** 有一個 **autocompact buffer**，目前大約 **33,000 tokens (16.5% of 200K window)**。即係話喺 200K window 之下，大約用到 **~167K tokens (83.5%)** 就會 compact
- **之前 (pre-v2.1.21)：** Buffer 係 **45,000 tokens (22.5%)**，即大約 77-78% 就觸發
- **1M window 之下：** Buffer 仍然係 ~33K tokens，但佔比只係 3.3%

**Buffer 計算公式：** 大約 `0.165 × context_window_size`，但有 bug report (#34363) 顯示呢個計算可以出錯 — 有人 upgrade 之後 buffer 變成 232.9K 用喺 200K window 上面，造成 infinite compaction loop。

---

## 2. Compaction 之後乜嘢會留低？

**確認會完整保留嘅：**
- **CLAUDE.md** — 從 disk 重新讀取再注入，唔係從 conversation history 攞。所以佢唔會被 summarize 或者 truncate
- **Memory files** — 同理，從 disk 讀取
- **System prompt** — 固定 overhead，每次都重新注入
- **Tool definitions** — 重新注入（但 deferred tools 喺 compaction 後曾經有 bug，v2.1.72 前 loaded via ToolSearch 嘅 tools 會 lose input schemas，導致 type errors）
- **Session metadata** — session name、plan mode state、configuration

**會被 lossy summarize 嘅：**
- **Conversation history** — 早期 messages 變成 condensed summary
- **File contents** — 之前 read 過嘅 file 內容會被壓縮，之後需要重新 read
- **Architectural decisions** — 只存在 conversation 入面嘅決定容易 lost
- **Tool call results** — 被 summarize

**實際教訓：** 如果你想任何嘢 survive compaction，寫落 CLAUDE.md 或者 memory files。Conversation-only instructions 係最常見嘅 "Claude 唔記得我講過" 嘅原因。

---

## 3. MCP Tool Definitions 點處理？ToolSearch 幾時 active？

**自動 defer 規則：**
- 當 MCP tool definitions **超過 context window 嘅 10%** 時，自動啟用 ToolSearch deferred loading
- 低過 10% 就 eager load 全部 schemas

**ToolSearch 進化歷史：**
1. **v2.0.70** — 以 "MCPSearch" 名義引入，只用於 MCP tools
2. **v2.1.14** — 改名做 "ToolSearch"
3. **v2.1.31** — 加入 `select:` syntax 做 direct tool loading
4. **v2.1.69** — 擴展到 built-in system tools（所有 tools 都 defer）
5. **v2.1.72** — Partial revert：核心 tools (Bash, Read, Edit, Write, Glob, Grep, Agent, Skill, ToolSearch) 重新 pre-load，其餘仍然 deferred

---

## 4. Deferred Tools 嘅具體機制同 Token 消耗

**Loaded tool（full schema）：** 每個 tool 消耗佢完整 JSON schema 嘅 tokens。例如：
- `browser_take_screenshot`: 370 tokens
- `gmail_create_draft`: 820 tokens
- `codex`: 445 tokens
- `list_tables` (SQLite): 40 tokens

**Deferred tool（name only）：** 只有 tool 名出現喺 `<available-deferred-tools>` list 入面。ToolSearch description 本身只佔 **~202 tokens**。

**Token 差異實測：**
| 狀態 | System tools tokens |
|---|---|
| v2.1.69 (全部 deferred) | ~968 tokens (0.5%) |
| v2.1.72 (partial revert) | ~8,100 tokens |
| Pre-v2.1.69 (全部 loaded) | ~14,000-16,000 tokens |

**已知 Bug：** Deferred tools loaded via ToolSearch 喺 compaction 後會 lose input schemas，導致 array/number parameters 被 reject。已修復。

---

## 5. Skill Description Budget

**公式：** `2% of context window`，minimum fallback **16,000 characters**（注意係 **characters** 唔係 tokens）

**實際運作：**
- Budget 係 character-based，唔係 token-based
- 每個 skill 大約有 ~109 characters fixed overhead (XML tags + name + location)
- 263-char descriptions → ~42 skills fit
- 130-char descriptions → ~67 skills fit
- Truncation 係 cumulative — 順序載入直到 budget 用完，之後嘅 skills 被 hidden
- `defer_loading` 同 ToolSearch **唔適用於 skills** — 只適用於 API-level tools

**實測：** 用 1M window 時，`/context` 顯示 Skills 只佔 333 tokens (0.0%)

---

## 6. System Prompt + Built-in Tools 嘅實際 Overhead

**最新實測數據 (1M context window, Opus 4.6)：**

| Component | Tokens | % |
|---|---|---|
| System prompt | 6,200 | 0.6% |
| System tools (loaded) | 11,600 | 1.2% |
| System tools (deferred) | 7,300 | 0.7% |
| MCP tools (loaded) | 1,200 | 0.1% |
| MCP tools (deferred) | 5,900 | 0.6% |
| Memory files | 3,300 | 0.3% |
| Skills | 333 | 0.0% |
| Autocompact buffer | 33,000 | 3.3% |
| **Total fixed overhead** | **~69,000** | **~6.9%** |

**另一個測量 (200K window, different setup)：**
- Total system prompt (all-in): ~14,328 tokens
- 呢個數字包含 Claude Code instructions + tool definitions + safety guidelines + CLAUDE.md

**Piebald-AI tracking (v2.1.84)：** 整個 system prompt 係 **110+ conditional strings**，唔係單一 string。Total 視乎 environment 而變。

---

## 7. Prompt Caching 點影響 "Context Used"

**Caching 機制：**
- System prompt 同 tool definitions 係 **cacheable** — 喺多個 turn 之間重用
- Cache write 貴 25%，cache read 只係 base price 嘅 10%
- Date 已經從 system prompt 移出去，maximize cache hit rate
- v2.1.72 修復咗 ToolSearch enabled 時 global system-prompt caching 唔 work 嘅問題

**對顯示嘅影響：** Prompt caching 唔改變 `/context` 顯示嘅 token count — 佢影響嘅係 **cost**，唔係 **context usage**。你睇到嘅 token 數係實際佔用嘅 context space，唔理係 cached 定 uncached。

---

## 8. Context Reporting 嘅已知 Bugs

呢個係最重要嘅發現之一：

**Critical Bug：`/context` 會 double-count MCP tools**
- 原因：Claude Code 計算每個 tool 嘅 token 時，分開 query 每個 tool，Anthropic 嘅 hidden tool-use system prompt (~313-346 tokens) 被 count 咗 **每個 tool 一次** 而唔係一次
- 實測：XcodeBuildMCP 直接測量 ~14,081 tokens，`/context` 報告 ~45,018 tokens — **3 倍膨脹**
- 2 個 tools batched 一齊：672 tokens；分開計再加：1,167 tokens

**其他已知 bugs：**
- `/context` header 顯示 0K tokens 但 breakdown 顯示正確數字 (#20861)
- Context limit reached 但 `/context` 顯示 74.4% remaining (#20455)
- 1M context limit 唔被 enforce，仍然用 200K boundary (#34158)
- Streaming response metadata 初始值為 0，唔更新 (#22575)
- "Context limit reached" 喺 27% usage 時觸發 (#24458)

---

## 你嘅 Implementation Constants 驗證

| Constant | 你嘅估算 | 實測數據 | 評估 |
|---|---|---|---|
| System loaded overhead | 12,500 tokens | 6,200 (prompt) + 11,600 (tools) = **17,800** | **偏低** — 你無計 system tools loaded 部分 |
| System deferred | 10,500 tokens | 7,300 (system deferred) + 5,900 (MCP deferred) = **13,200** | **偏低** — 但視乎你有幾多 MCP servers |
| MCP per-server estimate | 3,100 tokens | Playwright: 3,442; Gmail: 2,640; SQLite: 385; Jira: ~17,000 | **合理作為 median**，但 variance 極大 (385 - 17,000) |

**建議修正：**
- System loaded overhead: **~17,800 tokens** (prompt 6.2K + loaded tools 11.6K)
- System deferred: **~7,300 tokens** (只計 system deferred；MCP deferred 另計)
- MCP per-server: keep 3,100 as median estimate，但加 note: range 400-17,000

**重要：** `/context` 嘅 MCP 數字可能被 inflate 到 3x，所以如果你係靠 `/context` output 嚟 calibrate，真實數字可能只係顯示值嘅 1/3。

---

Sources:
- [Claude Code Context Buffer: The 33K-45K Token Problem](https://claudefa.st/blog/guide/mechanics/context-buffer-management)
- [Built-in system tools now deferred behind ToolSearch - Issue #31002](https://github.com/anthropics/claude-code/issues/31002)
- [Increase effective context window / reduce compaction overhead - Issue #28984](https://github.com/anthropics/claude-code/issues/28984)
- [Compaction death spiral - Issue #24677](https://github.com/anthropics/claude-code/issues/24677)
- [Autocompact buffer exceeds context window - Issue #34363](https://github.com/anthropics/claude-code/issues/34363)
- [Hierarchical deferred tool discovery - Issue #27208](https://github.com/anthropics/claude-code/issues/27208)
- [Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts)
- [MCP Server Token Costs: Full Breakdown](https://www.jdhodges.com/blog/claude-code-mcp-server-token-costs/)
- [Do MCP Servers Really Eat Half Your Context Window?](https://www.async-let.com/posts/claude-code-mcp-token-reporting/)
- [Claude Code /context Command Token Usage](https://www.jdhodges.com/blog/claude-code-context-slash-command-token-usage/)
- [Compaction - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/compaction)
- [Skill Budget Research (Gist)](https://gist.github.com/alexey-pelykh/faa3c304f731d6a962efc5fa2a43abe1)
- [DeepWiki: Context Window & Compaction](https://deepwiki.com/anthropics/claude-code/3.3-session-and-conversation-management)
- [How Claude Code Got Better by Protecting More Context](https://hyperdev.matsuoka.com/p/how-claude-code-got-better-by-protecting)
- [Where Do Your Claude Code Tokens Actually Go?](https://dev.to/slima4/where-do-your-claude-code-tokens-actually-go-we-traced-every-single-one-423e)
- [Context limit reached prematurely - Issue #20455](https://github.com/anthropics/claude-code/issues/20455)
- [/context header shows 0k tokens - Issue #20861](https://github.com/anthropics/claude-code/issues/20861)
- [Context limit reached at 27% usage - Issue #24458](https://github.com/anthropics/claude-code/issues/24458)

---

今日學到幾個 reusable insights 關於 Claude Code internals — 特別係 `/context` 嘅 3x inflation bug 同 skill budget 係 character-based 唔係 token-based。要唔要我 update 返 project docs？
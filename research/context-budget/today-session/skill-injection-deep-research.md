

I'll research how Claude Code loads skill descriptions into context. Let me search multiple sources in parallel.
Let me search multiple sources in parallel - the Piebald-AI repo, GitHub issues, and look at the BOS-AI skill-loading schema.


Now let me search for the actual Claude Code source code and system prompts that show how skills are injected.
Excellent finds. Let me now dig deeper into the specific sources - the Piebald-AI repo for actual skill injection format, the dev.to article about token budget overflow, and the GitHub issues.
Let me get the Piebald-AI repo contents and search for the actual skill listing format in system prompts.
Now let me read the README more carefully to find the exact skill-related system prompts and their filenames.
Now let me get the key files - the Skill tool description and the system-reminder for available skills listing.
Now let me get the official docs and search for the actual system-reminder format that lists available skills, plus the "first principles" deep dive.
Now let me read the Lee Han Chung deep dive which has the actual API request structure showing how skills are injected.
Now let me find the exact format of how skills are listed inside `<available_skills>`. Let me search the deep dive for the `nS6` and `aS6` functions that format the skill entries.
Now I have the complete picture. Let me also check what the current version (v2.1.84) shows versus the older format in the deep dive, since the Piebald-AI Skill tool description I already retrieved shows a slightly different format.
Now I have all the pieces. Let me also check the current live evidence from this very conversation -- I can see the `<system-reminder>` tags in the messages I'm receiving.

I now have comprehensive evidence from multiple sources. Here is the full analysis:

---

## 研究結果：Claude Code 點樣將 Skill Descriptions 載入 Context

### 1. Skill Descriptions 注入嘅確切內容

Skill descriptions 唔係放喺 system prompt 入面。佢哋係放喺 **`tools` array 入面嘅 `Skill` tool description** 度。

Claude Code 起動時，會建構一個動態嘅 tool description，格式如下：

```
Execute a skill within the main conversation

<skills_instructions>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke skills using this tool with the skill name only (no arguments)
- When you invoke a skill, you will see <command-message>The "{name}" skill is loading</command-message>
- The skill's prompt will expand and provide detailed instructions on how to complete the task
- Examples:
  - `command: "pdf"` - invoke the pdf skill
  - `command: "xlsx"` - invoke the xlsx skill
  - `command: "ms-office-suite:pdf"` - invoke using fully qualified name

Important:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already running
- Do not use this tool for built-in CLI commands (like /help, /clear, etc.)
</skills_instructions>

<available_skills>
${modeCommands}${limitedRegularCommands}
</available_skills>
```

每個 skill 嘅格式好簡單，就係：
```
"skill-name": Description text here - When user wants to do X
```

如果 frontmatter 有 `when_to_use`，format 就會係 `description - when_to_use`。如果冇，就純粹係 `description`。

### 2. 有冇 wrapping format？

**有，而且有兩層 XML wrapping**：

- 整個 skill instructions block 包住喺 `<skills_instructions>...</skills_instructions>` 入面
- 所有 individual skill entries 包住喺 `<available_skills>...</available_skills>` 入面
- 但每個 individual skill 冇額外嘅 XML tag -- 只係 plain text line

呢個同你喺呢個 conversation 見到嘅 **`<system-reminder>`** 係兩回事。`<system-reminder>` 係 Claude Code 喺 **tool result** 上面附加嘅，用嚟 re-inject rules、CLAUDE.md、同 skill availability。

### 3. System-reminder 入面嘅 Skills listing 格式

喺 `<system-reminder>` 入面（即係你而家呢個 conversation 見到嘅），格式係：

```
<system-reminder>
The following skills are available for use with the Skill tool:

- skill-name: Skill Description
- skill-name2: Another Description
</system-reminder>
```

呢個同 Skill tool description 入面嘅 `<available_skills>` 係 **分開嘅兩個地方**。你嘅 token count 差距就係因為呢個。

### 4. Token budget 包唔包含 formatting overhead？

根據官方文檔：

> "The budget scales dynamically at **2% of the context window**, with a fallback of **16,000 characters**."

呢個 budget 控制嘅係 `<available_skills>` 入面嘅 skill listing 文字長度（character-based，唔係 token-based）。環境變量 `SLASH_COMMAND_TOOL_CHAR_BUDGET` 可以 override。

但呢個 budget **唔包含**：
- `<skills_instructions>` wrapper text (~200 tokens 嘅 boilerplate)
- `<available_skills>` / `</available_skills>` XML tags
- Skill tool 本身嘅 parameter schema
- 而且亦唔包含 `<system-reminder>` 入面嘅 skill listing（呢個係額外嘅）

### 5. "Available skills" listing 嘅 header/footer

有兩個完全唔同嘅 listing：

**Location A -- Skill tool description（tools array 入面）：**
- Header: `<available_skills>`
- Content: `"name": description` 每行一個
- Footer: `</available_skills>`
- 包住喺成個 `<skills_instructions>` block 入面
- Token count: Skill tool description (Piebald-AI 數到 326 tokens base) + your skill descriptions

**Location B -- system-reminder（每個 tool call result 附加）：**
- Header: `The following skills are available for use with the Skill tool:`
- Content: `- name: description` 每行一個
- Footer: 冇

### 6. User-invocable vs Model-invocable skills 嘅 context injection 分別

根據官方 docs 嘅 invocation control table：

| Frontmatter | 你可以 invoke | Claude 可以 auto-invoke | Context loading |
|---|---|---|---|
| Default (冇 flags) | Yes | Yes | Description **always** in context |
| `disable-model-invocation: true` | Yes | No | Description **NOT** in context |
| `user-invocable: false` | No | Yes | Description **always** in context |

關鍵：`disable-model-invocation: true` 嘅 skills 完全唔會出現喺 `<available_skills>` listing 入面。佢哋唔食 token budget。

---

## 你嘅 Token Gap 嘅根本原因

你量到 ~978 tokens（只係 skill descriptions），但 `/context` 報 ~2802-3700 tokens。差距嘅來源：

1. **Skill tool boilerplate** (~326 tokens base): `<skills_instructions>` block 嘅所有 wrapper text、使用說明、examples
2. **system-reminder re-injection**: 每次 tool call 之後，skills listing 會以 `<system-reminder>` 形式再次注入。呢個係 **第二份 copy**
3. **Skill tool parameter schema**: `input_schema` 入面嘅 `command` field definition 都食 tokens
4. **system-prompt-tool-usage-skill-invocation** (102 tokens): 額外嘅 system prompt section 話 slash commands 點 invoke skills

簡單計：
- Skill tool description boilerplate: ~326 tokens
- Your skill descriptions inside `<available_skills>`: ~978 tokens
- Skill invocation usage prompt: ~102 tokens
- system-reminder skill listing (重複): ~200+ tokens
- Invoked skills reminder (33 tokens base): ~33 tokens
- **Total: ~1639-1800+ tokens** 

再加上 system-reminder re-injection 喺 tool calls 之後重複出現（confirmed by GitHub issue #32057: 同一 rules 每次 tool call 都 re-inject），可以解釋你見到嘅 2802-3700 range。

---

## 關鍵 Sources

- [Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts) -- v2.1.84 所有 system prompts + token counts
- [Lee Han Chung: Claude Agent Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) -- 反編譯嘅 actual code showing `<skills_instructions>` + `<available_skills>` XML wrapping
- [Why Claude Code Skills Don't Trigger (dev.to)](https://dev.to/lizechengnet/why-claude-code-skills-dont-trigger-and-how-to-fix-them-in-2026-o7h) -- token budget overflow 問題同 `SLASH_COMMAND_TOOL_CHAR_BUDGET` fix
- [GitHub issue #32057](https://github.com/anthropics/claude-code/issues/32057) -- system-reminder re-injection 食 46% context window
- [Official Claude Code Skills Docs](https://code.claude.com/docs/en/skills) -- 2% budget、16,000 char fallback、invocation control matrix

---

今日學到呢個 skill injection architecture 嘅 deep dive，要唔要我 update 返 project docs？
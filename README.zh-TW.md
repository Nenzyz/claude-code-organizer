# Claude Code Organizer

**管理你所有的 Claude Code 記憶、技能、MCP 伺服器和鉤子 — 按作用域層級查看，透過拖放在作用域之間移動。**

[![npm version](https://img.shields.io/npm/v/@mcpware/claude-code-organizer)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh-CN.md) | 繁體中文 | [日本語](README.ja.md) | [한국어](README.ko.md)

![Claude Code Organizer Demo](docs/demo.gif)

## 問題背景

你是否曾經讓 Claude Code「記住這個」，結果發現它把記憶存到了錯誤的作用域？

你在一個專案資料夾內，讓 Claude 記住某個偏好 — 它存到了當前專案的作用域。切換到另一個專案，Claude 完全不知道。那條記憶被困住了。

反過來也會發生 — 全域作用域中的技能或記憶實際上只適用於某個倉庫，卻洩漏到了所有專案中。

想修復？你需要手動翻找 `~/.claude/` 及其編碼路徑資料夾（`-home-user-projects-my-app/`），找到正確的檔案，然後自己移動。

**Claude Code Organizer 解決了這個問題。**

### 範例：專案 → 全域

你在某個專案內讓 Claude 記住「我偏好 TypeScript + ESM」，但這個偏好應該全域生效。打開儀表板，把那條記憶從專案作用域拖到全域作用域。搞定。

### 範例：全域 → 專案

你有一個部署技能放在全域，但它只對某個倉庫有意義。把它拖到那個專案作用域 — 其他專案就不會再看到它了。

---

## 功能特性

- **作用域層級視圖** — 所有項目按 全域 > 工作區 > 專案 組織，帶繼承指示器
- **拖放操作** — 在作用域之間移動記憶、技能、MCP 伺服器
- **移動確認** — 每次移動前都會彈出確認對話框
- **同類型安全** — 記憶只能移到記憶資料夾，技能到技能資料夾，MCP 到 MCP 設定
- **搜尋和篩選** — 即時搜尋所有項目，按類別篩選（記憶、技能、MCP、設定、鉤子、外掛、計畫）
- **詳情面板** — 點擊任意項目查看完整中繼資料、描述、檔案路徑，並在 VS Code 中開啟
- **零依賴** — 純 Node.js 內建模組，SortableJS 透過 CDN 載入
- **真實檔案移動** — 實際移動 `~/.claude/` 中的檔案，不只是檢視器

## 快速開始

```bash
# 直接執行（無需安裝）
npx @mcpware/claude-code-organizer

# 或全域安裝
npm install -g @mcpware/claude-code-organizer
claude-code-organizer
```

或者把這段話貼到 Claude Code 中：

> 執行 `npx @mcpware/claude-code-organizer` — 這是一個管理 Claude Code 設定的儀表板。準備好後告訴我 URL。

在 `http://localhost:3847` 開啟儀表板。直接操作你真實的 `~/.claude/` 目錄。

## 管理內容

| 類型 | 查看 | 跨作用域移動 |
|------|:----:|:----------:|
| 記憶（回饋、使用者、專案、參考） | 支援 | 支援 |
| 技能 | 支援 | 支援 |
| MCP 伺服器 | 支援 | 支援 |
| 設定（CLAUDE.md、settings.json） | 支援 | 鎖定 |
| 鉤子 | 支援 | 鎖定 |
| 外掛 | 支援 | 鎖定 |
| 計畫 | 支援 | 鎖定 |

## 作用域層級

```
全域                          <- 適用於所有地方
  公司 (工作區)                <- 適用於所有子專案
    公司倉庫1                  <- 專案專用
    公司倉庫2                  <- 專案專用
  副專案 (專案)                <- 獨立專案
  文件 (專案)                  <- 獨立專案
```

子作用域會繼承父作用域的記憶、技能和 MCP 伺服器。

## 運作原理

1. **掃描** `~/.claude/` — 發現所有專案、記憶、技能、MCP 伺服器、鉤子、外掛、計畫
2. **解析作用域層級** — 從檔案系統路徑確定父子關係
3. **渲染儀表板** — 作用域標題 > 類別欄 > 項目行，正確縮排
4. **處理移動** — 拖放或點擊「移動到...」時，實際移動磁碟上的檔案並進行安全檢查

## 平台支援

| 平台 | 狀態 |
|------|:----:|
| Ubuntu / Linux | 已支援 |
| macOS | 應該可用（未測試） |
| Windows | 暫不支援 |
| WSL | 應該可用（未測試） |

## 授權條款

MIT

## 作者

[ithiria894](https://github.com/ithiria894) — 為 Claude Code 生態系統建造工具。

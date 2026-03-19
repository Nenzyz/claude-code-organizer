# Claude Code Organizer

**管理你所有的 Claude Code 记忆、技能、MCP 服务器和钩子 — 按作用域层级查看，通过拖放在作用域之间移动。**

[![npm version](https://img.shields.io/npm/v/@mcpware/claude-code-organizer)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](README.md) | 简体中文 | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

![Claude Code Organizer Demo](docs/demo.gif)

## 问题背景

你是否曾经让 Claude Code "记住这个"，结果发现它把记忆存到了错误的作用域？

你在一个项目文件夹内，让 Claude 记住某个偏好 — 它存到了当前项目的作用域。切换到另一个项目，Claude 完全不知道。那条记忆被困住了。

反过来也会发生 — 全局作用域中的技能或记忆实际上只适用于某个仓库，却泄漏到了所有项目中。

想修复？你需要手动翻找 `~/.claude/` 及其编码路径文件夹（`-home-user-projects-my-app/`），找到正确的文件，然后自己移动。

**Claude Code Organizer 解决了这个问题。**

### 示例：项目 → 全局

你在某个项目内让 Claude 记住 "我偏好 TypeScript + ESM"，但这个偏好应该全局生效。打开仪表板，把那条记忆从项目作用域拖到全局作用域。搞定。

### 示例：全局 → 项目

你有一个部署技能放在全局，但它只对某个仓库有意义。把它拖到那个项目作用域 — 其他项目就不会再看到它了。

---

## 功能特性

- **作用域层级视图** — 所有项目按 全局 > 工作区 > 项目 组织，带继承指示器
- **拖放操作** — 在作用域之间移动记忆、技能、MCP 服务器
- **移动确认** — 每次移动前都会弹出确认对话框
- **同类型安全** — 记忆只能移到记忆文件夹，技能到技能文件夹，MCP 到 MCP 配置
- **搜索和筛选** — 即时搜索所有项目，按类别筛选（记忆、技能、MCP、配置、钩子、插件、计划）
- **详情面板** — 点击任意项目查看完整元数据、描述、文件路径，并在 VS Code 中打开
- **零依赖** — 纯 Node.js 内置模块，SortableJS 通过 CDN 加载
- **真实文件移动** — 实际移动 `~/.claude/` 中的文件，不只是查看器

## 快速开始

```bash
# 直接运行（无需安装）
npx @mcpware/claude-code-organizer

# 或全局安装
npm install -g @mcpware/claude-code-organizer
claude-code-organizer
```

或者把这段话粘贴到 Claude Code 中：

> 运行 `npx @mcpware/claude-code-organizer` — 这是一个管理 Claude Code 设置的仪表板。准备好后告诉我 URL。

在 `http://localhost:3847` 打开仪表板。直接操作你真实的 `~/.claude/` 目录。

## 管理内容

| 类型 | 查看 | 跨作用域移动 |
|------|:----:|:----------:|
| 记忆（反馈、用户、项目、引用） | 支持 | 支持 |
| 技能 | 支持 | 支持 |
| MCP 服务器 | 支持 | 支持 |
| 配置（CLAUDE.md、settings.json） | 支持 | 锁定 |
| 钩子 | 支持 | 锁定 |
| 插件 | 支持 | 锁定 |
| 计划 | 支持 | 锁定 |

## 作用域层级

```
全局                          <- 适用于所有地方
  公司 (工作区)                <- 适用于所有子项目
    公司仓库1                  <- 项目专用
    公司仓库2                  <- 项目专用
  副项目 (项目)                <- 独立项目
  文档 (项目)                  <- 独立项目
```

子作用域会继承父作用域的记忆、技能和 MCP 服务器。

## 工作原理

1. **扫描** `~/.claude/` — 发现所有项目、记忆、技能、MCP 服务器、钩子、插件、计划
2. **解析作用域层级** — 从文件系统路径确定父子关系
3. **渲染仪表板** — 作用域标题 > 类别栏 > 项目行，正确缩进
4. **处理移动** — 拖放或点击"移动到..."时，实际移动磁盘上的文件并进行安全检查

## 平台支持

| 平台 | 状态 |
|------|:----:|
| Ubuntu / Linux | 已支持 |
| macOS | 应该可用（未测试） |
| Windows | 暂不支持 |
| WSL | 应该可用（未测试） |

## 许可证

MIT

## 作者

[ithiria894](https://github.com/ithiria894) — 为 Claude Code 生态系统构建工具。

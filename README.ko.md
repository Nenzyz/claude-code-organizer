# Claude Code Organizer

[![npm version](https://img.shields.io/npm/v/@mcpware/claude-code-organizer)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | 한국어

**Claude Code의 메모리, 스킬, MCP 서버, 훅을 모두 관리 — 스코프 계층 구조로 보고, 드래그 앤 드롭으로 스코프 간 이동.**

![Claude Code Organizer Demo](docs/demo.gif)

## 문제

Claude Code에 "이것을 기억해"라고 했는데, 잘못된 스코프에 저장된 경험이 있나요?

프로젝트 폴더 안에서 Claude에게 설정을 기억시키면, 해당 프로젝트의 스코프에 저장됩니다. 다른 프로젝트로 전환하면 Claude는 그것을 모릅니다. 그 메모리는 갇혀버립니다.

반대의 경우도 발생합니다 — 글로벌 스코프에 있는 스킬이나 메모리가 실제로는 하나의 저장소에만 적용되는데, 모든 프로젝트에 누출됩니다.

수정하려면 `~/.claude/`와 인코딩된 경로 폴더(`-home-user-projects-my-app/`)를 수동으로 뒤져서 올바른 파일을 찾아 직접 이동해야 합니다.

**Claude Code Organizer가 이 문제를 해결합니다.**

### 예시: 프로젝트 → 글로벌

프로젝트 안에서 Claude에게 "TypeScript + ESM 선호"를 기억시켰지만, 이 설정은 모든 곳에 적용되어야 합니다. 대시보드를 열고 그 메모리를 프로젝트 스코프에서 글로벌 스코프로 드래그하세요. 끝.

### 예시: 글로벌 → 프로젝트

글로벌에 배포 스킬이 있지만 하나의 저장소에만 의미가 있습니다. 해당 프로젝트 스코프로 드래그하면 다른 프로젝트에서는 더 이상 보이지 않습니다.

---

## 기능

- **스코프 계층 뷰** — 글로벌 > 워크스페이스 > 프로젝트로 정리, 상속 표시기 포함
- **드래그 앤 드롭** — 스코프 간 메모리, 스킬, MCP 서버 이동
- **이동 확인** — 파일을 변경하기 전에 확인 대화상자 표시
- **동일 타입 안전성** — 메모리는 메모리 폴더로만, 스킬은 스킬 폴더로만 이동 가능
- **검색 & 필터** — 모든 항목을 즉시 검색, 카테고리별 필터 (메모리, 스킬, MCP, 설정, 훅, 플러그인, 플랜)
- **상세 패널** — 항목을 클릭하여 메타데이터, 설명, 파일 경로 확인, VS Code에서 열기
- **의존성 제로** — 순수 Node.js 내장 모듈, SortableJS는 CDN으로 로드
- **실제 파일 이동** — `~/.claude/`의 파일을 실제로 이동, 단순한 뷰어가 아닙니다

## 빠른 시작

```bash
# 직접 실행 (설치 불필요)
npx @mcpware/claude-code-organizer

# 또는 글로벌 설치
npm install -g @mcpware/claude-code-organizer
claude-code-organizer
```

또는 Claude Code에 이것을 붙여넣으세요:

> `npx @mcpware/claude-code-organizer`를 실행해주세요 — Claude Code 설정을 관리하는 대시보드입니다. 준비되면 URL을 알려주세요.

`http://localhost:3847`에서 대시보드가 열립니다. 실제 `~/.claude/` 디렉토리에서 작동합니다.

## 관리 대상

| 타입 | 보기 | 스코프 간 이동 |
|------|:----:|:------------:|
| 메모리 (피드백, 사용자, 프로젝트, 참조) | 지원 | 지원 |
| 스킬 | 지원 | 지원 |
| MCP 서버 | 지원 | 지원 |
| 설정 (CLAUDE.md, settings.json) | 지원 | 잠금 |
| 훅 | 지원 | 잠금 |
| 플러그인 | 지원 | 잠금 |
| 플랜 | 지원 | 잠금 |

## 스코프 계층 구조

```
글로벌                          <- 모든 곳에 적용
  회사 (워크스페이스)             <- 모든 하위 프로젝트에 적용
    회사저장소1                   <- 프로젝트 전용
    회사저장소2                   <- 프로젝트 전용
  사이드프로젝트 (프로젝트)        <- 독립 프로젝트
  문서 (프로젝트)                 <- 독립 프로젝트
```

하위 스코프는 상위 스코프의 메모리, 스킬, MCP 서버를 상속합니다.

## 작동 방식

1. **스캔** `~/.claude/` — 모든 프로젝트, 메모리, 스킬, MCP 서버, 훅, 플러그인, 플랜 검색
2. **스코프 계층 해석** — 파일 시스템 경로에서 부모-자식 관계 결정
3. **대시보드 렌더링** — 스코프 헤더 > 카테고리 바 > 항목 행, 적절한 들여쓰기
4. **이동 처리** — 드래그하거나 "이동..."을 클릭하면 안전 검사를 거쳐 디스크의 파일을 실제로 이동

## 플랫폼 지원

| 플랫폼 | 상태 |
|--------|:----:|
| Ubuntu / Linux | 지원 |
| macOS | 작동 예상 (미테스트) |
| Windows | 미지원 |
| WSL | 작동 예상 (미테스트) |

## 라이선스

MIT

## 작성자

[ithiria894](https://github.com/ithiria894) — Claude Code 생태계를 위한 도구 제작.

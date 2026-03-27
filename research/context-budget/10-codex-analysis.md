# Codex Analysis — Context Budget

Source scope: based only on `06-local-scan-results.md` and `09-verified-claims-registry.md`.

## 1. What we can actually measure offline from `~/.claude/`

- Exact file counts, byte sizes, and directory inventory for memories, skills, `CLAUDE.md`, config, plans, sessions, file-history, and plugins. Confidence: High.
- Exact parsed config structure from local JSON: permissions, guards, allowed directories, MCP definitions, and config-history versions. Confidence: High.
- Exact session archive volume: number of JSONL files, total bytes, and total lines. Confidence: High.
- Presence/count of literal `system-reminder` entries inside locally stored session logs. Confidence: High for scanned files; Medium for any global rate unless every file is scanned.
- Token counts for local file contents if we run a local tokenizer. Confidence: High with `ai-tokenizer`; Medium with `bytes/4`.
- Project-level preload estimate from local artifacts such as memories, `CLAUDE.md`, and config. Confidence: Medium, because the current note mixes direct local measurements with assumptions about skills loading and immutable scaffold.

## 2. What cannot be measured offline and why

- The immutable system prompt + tool scaffold actually sent on each request (`~21K` claim) cannot be measured from `~/.claude/` because it is not stored there.
- Actual per-request prompt assembly cannot be measured offline from files alone: rule re-injection, hidden injections, and MCP/runtime payloads are assembled at runtime.
- Exact real request token count cannot be recovered from bytes alone; tokenization is model-specific.
- Model behavior claims like context rot or accuracy degradation cannot be measured from local files because they are model-performance effects, not filesystem artifacts.

## 3. Best tokenizer approach

Use `ai-tokenizer` for user-facing numbers.

Why: the registry marks it as directly verified at `99.79%` accuracy for Claude Opus 4.5, while `bytes/4` is only a rough heuristic used for the local scan estimates. If dependency minimization matters, keep `bytes/4` as a fallback estimate, not the primary number.

## 4. 21.8% vs 21.9%

Most likely rounding, not a substantive error.

`09-verified-claims-registry.md` verifies `21.8%` as the paper's headline figure. If the component figures (`11.0`, `2.2`, `8.7`) were independently rounded to one decimal place, their displayed sum can differ by `0.1`.

## 5. Single most impactful Context Budget panel item

Show the user's estimated fixed overhead before their actual task starts, or equivalently their remaining usable budget after fixed overhead.

That is the highest-impact number because it is personal, offline-measurable enough to defend, and immediately answers: "How much of my context is already gone before I type anything useful?"

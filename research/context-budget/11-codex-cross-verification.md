# Codex Cross-Verification Results

**Date:** 2026-03-25
**Method:** Codex CLI (GPT-5.4, xhigh reasoning) reading all 9 research files

## Findings

### Registry Gaps

1. **File 06 (local scan) entirely unrepresented in registry** — includes ~40KB (~10K tokens) memory, 132,688 skill bytes, 12,813 config bytes, 672 session files, and ~36K-39K estimated pre-session load. These are our OWN measurements and should be added to registry.

2. **File 07 (tokenizer) omits several claims** — Claude accuracy at smaller contexts, performance claims (5-7x faster), ~97% js-tiktoken approximation, Anthropic API 100% accuracy, and bytes/4 ~75-85% accuracy all missing from registry.

3. **File 08 (readFileState) has unregistered claims** beyond Tier 3 — Date.now() vs mtime timestamping, partial-read skip logic, repeated injections on path mismatch, Agent SDK resume behavior, up to 10 full files injected after resume. All should be in Tier 3 (unverified).

### 21.8% Rounding Issue

The registry matches file 01's headline figure of 21.8%. But the component breakdown (11.0% + 2.2% + 8.7%) sums to 21.9%. Codex confirms this is most likely rounding — each component was independently rounded to one decimal place. The paper's headline figure (21.8%) should be used as-is with a note about the rounding.

### Action Items

- [ ] Add local scan measurements to registry as new Tier (our own data)
- [ ] Add tokenizer accuracy claims to registry
- [ ] Expand Tier 3 with all readFileState reverse-engineering claims
- [ ] Annotate 21.8% entry with rounding note

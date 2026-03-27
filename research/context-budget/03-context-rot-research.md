# Context Rot Research — Multiple Sources

## Chroma Context Rot Study (2025-07)

**Source:** https://www.trychroma.com/research/context-rot
**Verified:** Referenced by Anthropic, diffray.ai, morphllm.com, multiple outlets

### Key Findings
- Tested **18 frontier models** including GPT-4.1, Claude 4, Gemini 2.5
- **Every single model** degrades with increasing context length — no exceptions
- Shuffled (unstructured) haystacks performed BETTER than coherent ones — structural patterns may interfere with attention
- Claude models: lowest hallucination rate, tends toward conservative abstention
- GPT models: ~2.55% hallucination rate
- Significant accuracy gap between focused (~300 tokens) and full (~113K tokens) inputs on LongMemEval

## Adobe NoLiMa Research (2025-02)

**Source:** Referenced in diffray.ai/blog/context-dilution and understandingai.org
**Verified:** Numbers cited consistently across multiple sources

### Key Findings (at 32K context)
- GPT-4o: **99% → 70% accuracy** (29% drop)
- Claude 3.5 Sonnet: **88% → 30% accuracy** (58% drop)
- Gemini 2.5 Flash: **94% → 48% accuracy** (46% drop)
- Llama 4 Scout: **82% → 22% accuracy** (60% drop)
- Performance degradation is MORE SEVERE on complex tasks requiring multi-hop reasoning

## "Context Length Alone Hurts" (arXiv Oct 2025)

**Source:** Referenced in diffray.ai
**Verified:** Cited as arXiv paper

### Key Findings
- Even with **100% perfect retrieval** of relevant information, performance degrades **13.9% to 85%** as input length increases
- The degradation occurs even when irrelevant context is removed — length itself imposes a "cognitive tax"
- Prompting models to recite retrieved evidence before solving improved GPT-4o by 4% (RULER benchmark)

## Anthropic Official Position (2025-09)

**Source:** https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
**Verified:** YES (HTTP 200)

### Key Statements
- "Context rot: as the number of tokens in the context window increases, the model's [performance] degrades"
- "Context must be treated as a finite resource with diminishing marginal returns"
- "Like humans, who have limited working memory"
- "Good context engineering means finding the smallest possible set of high-signal tokens"
- CLAUDE.md is injected as `<system-reminder>` in messages array, NOT in system prompt (for cache economics)

## Relevance to CCO

Context rot is not theoretical — it's measured, universal, and severe. Every wrong-scope memory or skill in your context actively makes Claude worse. CCO's Context Budget feature will quantify this damage.

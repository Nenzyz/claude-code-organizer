# Paper: The Missing Memory Hierarchy — Demand Paging for LLM Context Windows

**Source:** arXiv 2603.09023
**Author:** Tony Mason (UBC)
**Published:** 2026-03-09
**URL:** https://arxiv.org/abs/2603.09023
**Verified:** YES (HTTP 200, title confirmed)

## Abstract (verbatim from arXiv)

The context window of a large language model is not memory. It is L1 cache: a small, fast, expensive resource that the field treats as the entire memory system. There is no L2, no virtual memory, no paging. Every tool definition, every system prompt, and every stale tool result occupies context for the lifetime of the session. The result is measurable: across 857 production sessions and 4.45 million effective input tokens, 21.8% is structural waste. We present Pichay, a demand paging system for LLM context windows. Implemented as a transparent proxy between client and inference API, Pichay interposes on the message stream to evict stale content, detect page faults when the model re-requests evicted material, and pin working-set pages identified by fault history. In offline replay across 1.4 million simulated evictions, the fault rate is 0.0254%. In live production deployment over 681 turns, the system reduces context consumption by up to 93% (5,038KB to 339KB); under extreme sustained pressure, the system remains operational but exhibits the expected thrashing pathology, with repeated fault-in of evicted content.

## Key Numbers

- **857 production sessions** instrumented (Claude Code, single power user, ~4 months Nov 2025 - Mar 2026)
- **4.45 million effective input tokens** analyzed
- **21.8% structural waste** from three sources:
  - Unused tool schemas: **11.0%**
  - Duplicated content: **2.2%**
  - Stale tool results: **8.7%** reprocessed at median **84.4x amplification**
- Pichay demand paging: **0.0254% fault rate** (offline), up to **93% context reduction** (live)
- 15 distinct projects across corpus

## Relevance to CCO Context Budget

This paper directly measures the exact problem we're solving. The 21.8% waste figure is our strongest citation for why context budget estimation matters.

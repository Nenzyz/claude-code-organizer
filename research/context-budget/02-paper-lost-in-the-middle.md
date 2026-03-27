# Paper: Lost in the Middle — How Language Models Use Long Contexts

**Source:** arXiv 2307.03172
**Authors:** Nelson F. Liu, Kevin Lin, John Hewitt, Ashwin Paranjape, Michele Bevilacqua, Fabio Petroni, Percy Liang (Stanford)
**Published:** 2023-07 (updated 2024)
**URL:** https://arxiv.org/abs/2307.03172
**Verified:** YES (HTTP 200)
**Citations:** Extremely high — foundational paper in the field

## Key Findings

- LLM performance follows a **U-shaped curve**: highest accuracy when relevant info is at the **beginning or end** of context, worst when in the **middle**
- In multi-document QA with 20 documents: accuracy dropped by **more than 30%** when relevant document was in the middle position vs start/end
- This effect persists across all tested models
- The ~50% position in context is consistently the worst-performing location

## Relevance to CCO

This is the foundational research showing that irrelevant context doesn't just waste tokens — it actively degrades accuracy. CCO's scope contamination (wrong-scope items loaded into context) directly causes this problem.

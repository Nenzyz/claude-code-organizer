# Tokenizer Options for Context Budget Feature

## Option 1: ai-tokenizer (RECOMMENDED)

**Package:** ai-tokenizer
**npm:** https://www.npmjs.com/package/ai-tokenizer
**Version:** 1.0.6
**License:** MIT
**Verified:** YES

### Accuracy
| Model | ~500 tokens | ~5k tokens | ~50k tokens |
|-------|------------|------------|-------------|
| anthropic/claude-opus-4.5 | 98.48% | 98.56% | **99.79%** |
| openai/gpt-5.1-codex | 79.84% | 98.72% | 99.65% |
| google/gemini-3-pro-preview | 98.70% | 98.77% | 98.91% |

### Performance
- **5-7x faster than tiktoken**
- On par with gpt-tokenizer
- Benchmark: 13.99 us/iter vs tiktoken 85.05 ms/iter

### Usage
```js
import Tokenizer, { models } from "ai-tokenizer";
const model = models["anthropic/claude-opus-4.5"];
const count = Tokenizer.count(text, model);
```

## Option 2: @lenml/tokenizer-claude

**Package:** @lenml/tokenizer-claude
**License:** Apache-2.0
**Verified:** YES (npm search confirmed)
- Claude-specific tokenizer
- Less documentation/benchmarks available

## Option 3: js-tiktoken with p50k_base

**Package:** js-tiktoken
**License:** MIT
**Verified:** YES
- OpenAI's tokenizer ported to JS
- p50k_base encoding approximates Claude (~97% per Propel guide)
- Well-maintained by OpenAI team

## Option 4: Anthropic API (online only)

```js
const count = await client.messages.countTokens({ model, messages });
```
- 100% accurate (official)
- Requires API key + network
- Not suitable for offline use

## Recommendation

**ai-tokenizer** — 99.79% accuracy for Claude, MIT license, 5-7x faster, works offline, zero config. Only dependency we'd need to add.

However: our README claims "zero dependencies". Adding ai-tokenizer would break this claim. Options:
1. Add as optional dependency (only loaded when Context Budget feature is used)
2. Use simple bytes/4 estimation with disclaimer
3. Bundle a minimal tokenizer inline

## Note on "Zero Dependencies" Claim

Currently CCO has zero runtime dependencies (MCP SDK is optional for --mcp mode). The bytes/4 approximation is ~75-85% accurate. For a "Context Budget" feature, we should be transparent about the estimation method used.

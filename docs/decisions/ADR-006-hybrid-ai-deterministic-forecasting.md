# ADR-006: Hybrid AI Architecture: Deterministic Operations + Statistical ML + LLM Copilot

## Status
Accepted

## Context
Retail inventory requires precision. A stockout calculation that is off by 10% can cause hundreds of thousands in lost sales or excessive tied-up capital. Modern systems often mistakenly attempt to use Generative AI (LLMs) to calculate numbers, predict demand quantities, or compute safety stock. LLMs are non-deterministic and prone to hallucinations.

## Decision
We implemented a strict **Three-Tier Hybrid AI & Analytics Architecture**:
1. **Tier 1: Pure Deterministic Mathematics (TypeScript):**
   * Safety stock formulas ($Z \times \sigma_L \times \sqrt{L}$)
   * Lead-time demand & Reorder Points ($ROP = d \cdot L + SS$)
   * Minimum Order Quantity (MOQ) and batch constraints.
2. **Tier 2: Statistical Time-Series Forecasting (Python/FastAPI):**
   * Exponential Smoothing and Croston's intermittent demand algorithms.
   * Numerical uncertainty quantification (P10, P50, P90 confidence intervals).
3. **Tier 3: Grounded Conversational Copilot (Google Gemini 2.5 Flash):**
   * Restricted to multi-round database tool-calling. The LLM never computes math directly; it queries the deterministic database aggregates and translates them into natural language strategic recommendations.

### Rationale
* Financial inventory figures must be 100% mathematically reproducible and auditable.
* Machine learning is optimal for pattern recognition over noisy timeseries, but not for rule enforcement.
* LLMs excel at natural language synthesis, executive summaries, and multi-tool orchestration, but should never perform arithmetic.

## Consequences
* **Positive:** Mathematically sound, zero hallucinated inventory figures, clear audit trail, and intuitive natural language interaction for retail store managers.
* **Negative:** Requires managing three distinct execution tiers (Node.js engine, Python microservice, and external Gemini API).

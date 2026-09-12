import type { AnomalyDirection } from "./anomalyDetection";

/**
 * Generates possible (never certain) explanations for a detected
 * anomaly. Per spec section 24, these must be presented as hypotheses,
 * not diagnoses — the system cannot know WHY demand changed, only THAT
 * it changed unusually.
 */
export function generateHypotheses(direction: AnomalyDirection): string[] {
  if (direction === "spike") {
    return [
      "A promotion or price change may have driven increased demand.",
      "A competitor may be out of stock, redirecting customers here.",
      "This could reflect a seasonal or event-driven demand increase.",
      "This could also be a data entry or duplicate-sale issue — worth a quick check.",
    ];
  }

  return [
    "A price increase may have reduced demand.",
    "A competitor may be offering a lower price or promotion.",
    "The product may have a stock visibility issue (e.g., not displayed prominently).",
    "This could reflect a genuine decline in demand for this product.",
    "This could also be a data ingestion issue — worth confirming sales are being recorded correctly.",
  ];
}
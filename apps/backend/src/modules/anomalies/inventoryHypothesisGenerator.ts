import type { AnomalyDirection } from "./anomalyDetection";

export function generateInventoryHypotheses(direction: AnomalyDirection): string[] {
  if (direction === "spike") {
    return [
      "This could be a large bulk restock or purchase order received.",
      "This could be a major stock correction (e.g. after a physical count).",
      "This could be a data entry error — worth double-checking the quantity entered.",
    ];
  }
  return [
    "This could be a partial delivery from a supplier, smaller than the usual order.",
    "This could be a smaller correction than typical for this product.",
    "This could be a data entry error — worth confirming the quantity entered.",
  ];
}
"""
Baseline forecasting models. Each function takes a list of historical
daily demand values (most recent last) and returns a single forecasted
value for the next period. These are deliberately simple, explainable
models — see docs/ml/ADR-forecasting-baselines.md for why we start here
rather than jumping to a more complex model.
"""
from typing import List


def moving_average(history: List[float], window: int = 7) -> float:
    """
    Simple moving average: the mean of the last `window` observations.
    If fewer observations exist than the window, uses whatever is available.
    """
    if not history:
        return 0.0
    if window <= 0:
        raise ValueError("window must be positive.")

    recent = history[-window:]
    return sum(recent) / len(recent)


def weighted_moving_average(history: List[float], window: int = 7) -> float:
    """
    Weighted moving average: more recent observations count more.
    Weights are 1, 2, 3, ..., window (most recent gets the highest weight).
    """
    if not history:
        return 0.0
    if window <= 0:
        raise ValueError("window must be positive.")

    recent = history[-window:]
    n = len(recent)
    weights = list(range(1, n + 1))  # e.g. [1, 2, 3] for 3 data points
    weighted_sum = sum(v * w for v, w in zip(recent, weights))
    weight_total = sum(weights)
    return weighted_sum / weight_total


def exponential_smoothing(history: List[float], alpha: float = 0.3) -> float:
    """
    Simple exponential smoothing. `alpha` controls how much weight the
    most recent observation gets relative to smoothed history (0 < alpha <= 1).
    Higher alpha = reacts faster to recent changes; lower alpha = smoother,
    slower to react. 0.3 is a common, reasonable default starting point.
    """
    if not history:
        return 0.0
    if not (0 < alpha <= 1):
        raise ValueError("alpha must be between 0 (exclusive) and 1 (inclusive).")

    smoothed = history[0]
    for value in history[1:]:
        smoothed = alpha * value + (1 - alpha) * smoothed
    return smoothed
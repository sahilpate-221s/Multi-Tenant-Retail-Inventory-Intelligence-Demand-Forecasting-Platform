"""
Backtesting harness: evaluates a forecasting function against historical
data by simulating repeated "stand here, forecast the next day, compare
to what actually happened" trials, then scoring the results.
"""
from typing import List, Callable
from dataclasses import dataclass


@dataclass
class BacktestResult:
    mae: float
    rmse: float
    wape: float
    num_trials: int


def backtest(
    history: List[float],
    forecast_fn: Callable[[List[float]], float],
    min_history_size: int = 7,
) -> BacktestResult:
    """
    Rolling-origin backtest: for each point in history (after an initial
    warm-up of `min_history_size` days), forecast the NEXT day using only
    data available up to that point, then compare to the actual value.

    Example with min_history_size=3 and history=[a,b,c,d,e]:
      trial 1: forecast using [a,b,c], compare to d
      trial 2: forecast using [a,b,c,d], compare to e
    """
    if len(history) <= min_history_size:
        raise ValueError(
            f"Need more than {min_history_size} data points to backtest "
            f"(got {len(history)})."
        )

    errors: List[float] = []
    actuals: List[float] = []

    for i in range(min_history_size, len(history)):
        training_data = history[:i]
        actual_next = history[i]
        forecasted = forecast_fn(training_data)

        errors.append(forecasted - actual_next)
        actuals.append(actual_next)

    absolute_errors = [abs(e) for e in errors]
    squared_errors = [e ** 2 for e in errors]

    mae = sum(absolute_errors) / len(absolute_errors)
    rmse = (sum(squared_errors) / len(squared_errors)) ** 0.5

    total_actual = sum(actuals)
    # WAPE is undefined (0/0) if actual demand was genuinely zero across
    # the entire backtest window — that's a real edge case for a brand
    # new or extremely slow product, not a bug to hide with a fake number.
    wape = sum(absolute_errors) / total_actual if total_actual > 0 else float("nan")

    return BacktestResult(mae=mae, rmse=rmse, wape=wape, num_trials=len(errors))
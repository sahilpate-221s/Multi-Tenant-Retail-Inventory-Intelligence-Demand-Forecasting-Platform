from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.forecasting.baselines import moving_average, weighted_moving_average, exponential_smoothing
from app.forecasting.backtesting import backtest

router = APIRouter()


class ForecastRequest(BaseModel):
    history: List[float]  # daily demand values, oldest first


class ModelScore(BaseModel):
    model: str
    mae: float
    rmse: float
    wape: float | None


class ForecastResponse(BaseModel):
    forecast: float
    bestModel: str
    modelScores: List[ModelScore]
    daysOfHistory: int


@router.post("/forecast", response_model=ForecastResponse)
def generate_forecast(request: ForecastRequest):
    history = request.history

    candidates = {
        "moving_average": lambda h: moving_average(h, window=7),
        "weighted_moving_average": lambda h: weighted_moving_average(h, window=7),
        "exponential_smoothing": lambda h: exponential_smoothing(h, alpha=0.3),
    }

    # Not enough data to backtest meaningfully — fall back to the
    # simplest model applied directly, and say so honestly rather than
    # pretending a comparison happened.
    min_size = 8
    if len(history) <= min_size:
        forecast_value = moving_average(history, window=7)
        return ForecastResponse(
            forecast=round(forecast_value, 3),
            bestModel="moving_average_insufficient_data_for_backtest",
            modelScores=[],
            daysOfHistory=len(history),
        )

    scores: List[ModelScore] = []
    for name, fn in candidates.items():
        result = backtest(history, fn, min_history_size=7)
        wape_value = None if result.wape != result.wape else round(result.wape, 4)  # NaN check
        scores.append(ModelScore(model=name, mae=round(result.mae, 4), rmse=round(result.rmse, 4), wape=wape_value))

    best = min(scores, key=lambda s: s.mae)
    forecast_value = candidates[best.model](history)

    return ForecastResponse(
        forecast=round(forecast_value, 3),
        bestModel=best.model,
        modelScores=scores,
        daysOfHistory=len(history),
    )
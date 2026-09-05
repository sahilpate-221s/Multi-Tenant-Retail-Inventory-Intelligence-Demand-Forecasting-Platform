from fastapi import FastAPI
from datetime import datetime, timezone
from app.forecasting.router import router as forecasting_router

app = FastAPI(title="StockPilot ML Service")

app.include_router(forecasting_router, prefix="/api")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "stockpilot-ml",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
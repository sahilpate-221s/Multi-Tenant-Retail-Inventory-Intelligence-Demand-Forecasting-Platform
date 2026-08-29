from fastapi import FastAPI
from datetime import datetime, timezone

app = FastAPI(title="StockPilot ML Service")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "stockpilot-ml",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
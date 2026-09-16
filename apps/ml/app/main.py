from fastapi import FastAPI
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
from app.forecasting.router import router as forecasting_router

app = FastAPI(title="StockPilot ML Service")

app.include_router(forecasting_router, prefix="/api")


@app.get("/live")
def live():
    return {"status": "alive"}


@app.get("/ready")
def ready():
    checks = {}
    try:
        # The ML service doesn't use Redis/Postgres directly (Phase 10's
        # architecture decision: it's stateless), so readiness here just
        # confirms the process can actually respond - genuinely simple
        # by design, not a placeholder.
        checks["service"] = True
    except Exception:
        checks["service"] = False

    all_ready = all(checks.values())
    status_code = 200 if all_ready else 503
    return JSONResponse(
        status_code=status_code,
        content={"status": "ready" if all_ready else "not_ready", "checks": checks},
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "stockpilot-ml",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
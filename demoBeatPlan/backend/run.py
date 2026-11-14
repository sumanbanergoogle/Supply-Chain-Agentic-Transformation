"""Local Uvicorn runner for BeatPulse AI (ITC TM&D) backend."""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("BACKEND_PORT", os.getenv("PORT", "8002")))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        ws_ping_interval=20,
        ws_ping_timeout=20,
    )

"""FastAPI entry point for ITC TM&D BeatPulse AI."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.analytics.ml_engine import get_engine
from app.api.live import router as live_router
from app.api.routes import router as api_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    eng = get_engine()
    print(f"[✓] BeatPulse AI Ready: {len(eng.outlets)} ITC GT outlets across Bangalore, Hyderabad, Chennai")
    yield


app = FastAPI(
    title="BeatPulse AI — ITC TM&D API",
    description="Hyper-Local GT Revenue Leakage, Beat Optimization & Gemini Live Copilot",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(live_router)

possible_dist_paths = [
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"),
    os.path.join(os.path.dirname(__file__), "..", "static"),
    "/app/frontend/dist",
]
for p in possible_dist_paths:
    abs_p = os.path.abspath(p)
    if os.path.exists(abs_p) and os.path.exists(os.path.join(abs_p, "index.html")):
        app.mount("/", StaticFiles(directory=abs_p, html=True), name="frontend")
        break

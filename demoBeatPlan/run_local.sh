#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

echo "======================================================================"
echo "     Sahayak AI · ITC TM&D BeatPulse (Local Demo Runner)              "
echo "======================================================================"

command -v uv >/dev/null 2>&1 || { echo "[!] uv is required."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "[!] npm is required."; exit 1; }

if [ ! -d "${BACKEND_DIR}/.venv" ]; then
    echo "[*] Syncing Python backend dependencies..."
    (cd "${BACKEND_DIR}" && uv sync --no-config --default-index https://pypi.org/simple)
fi

if [ ! -f "${BACKEND_DIR}/app/data/landing/outlet_master.parquet" ]; then
    echo "[*] Generating ITC TM&D synthetic dataset (Bangalore, Hyderabad, Chennai)..."
    (cd "${BACKEND_DIR}" && .venv/bin/python -m app.analytics.generator)
fi

if [ ! -d "${FRONTEND_DIR}/node_modules" ]; then
    echo "[*] Installing frontend dependencies..."
    (cd "${FRONTEND_DIR}" && npm install)
fi

cleanup() {
    echo ""
    echo "[*] Shutting down BeatPulse services..."
    [ -n "${BACKEND_PID:-}" ] && kill "${BACKEND_PID}" 2>/dev/null || true
    [ -n "${FRONTEND_PID:-}" ] && kill "${FRONTEND_PID}" 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "[*] Starting FastAPI + Gemini Live proxy on http://localhost:8002..."
(cd "${BACKEND_DIR}" && exec .venv/bin/python run.py) &
BACKEND_PID=$!

for i in {1..30}; do
    if curl -s http://localhost:8002/api/health >/dev/null 2>&1; then
        echo "[✓] Backend is healthy!"
        break
    fi
    sleep 0.5
done

echo "[*] Starting Vite + React frontend on http://localhost:5180..."
(cd "${FRONTEND_DIR}" && npm run dev -- --host 0.0.0.0 --port 5180) &
FRONTEND_PID=$!

echo "======================================================================"
echo "[✓] ITC TM&D BeatPulse AI running!"
echo "    • Executive Dashboard: http://localhost:5180"
echo "    • FastAPI Swagger:     http://localhost:8002/docs"
echo "======================================================================"
wait

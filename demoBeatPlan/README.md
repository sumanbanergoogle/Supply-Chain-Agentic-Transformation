# Sahayak AI · ITC TM&D BeatPulse

**Hyper-Local General Trade Revenue Leakage & Zero-Billing Prevention Copilot** for ITC Limited Trade Marketing & Distribution (TM&D) across **Bangalore**, **Hyderabad**, and **Chennai**, modeled on the geospatial + question-driven + auto-enabled Gemini Live architecture of `workover-operations-ai-agent-cloudrun`.

## Core Capabilities

1. **Executive Geospatial Command Center (`OutletMap.tsx`)**:
   - Interactive South India macro view across **Bangalore**, **Hyderabad**, and **Chennai** (`108` GT outlets, `18` Salesman Beats, `9` Wholesale Distributors/Stockists, and `10` Quick-Commerce Dark Store pressure hubs).
   - Pulsing 3-tier outlet markers (**Productive**, **At-Risk / LSPC Erosion**, **Zero-Billing Risk**), WD diamond hubs, Q-Commerce 1 km cannibalization rings, and overloaded beat trails.
2. **ML & Deep Learning Diagnostics (`app/analytics/ml_engine.py`)**:
   - **GradientBoosting Churn Classifier + Tree SHAP Decomposition** breaking down monthly NSV leakage across 5 ITC TM&D levers:
     - *Hero SKU Stock-Out (Aashirvaad Atta / Sunfeast Dark Fantasy)*
     - *Q-Commerce Dark-Store Cannibalization (Zepto / Blinkit / Instamart)*
     - *Beat Coverage Fatigue (<4 min salesman visit duration)*
     - *WD Credit Overdue & Invoice Block*
     - *Storefront Vision Shelf / Tier Mismatch (Savlon / Fiama / Classmate gap)*
   - **Spatio-Temporal GNN Spillover Score** (`gnn_spillover_risk`) aggregating 2.2 km neighbor contagion + dark-store proximity.
   - **k-NN Historical Analogs & Top-3 Next Best Actions** + **Counterfactual Comparison Matrix**.
   - **Counterfactual Beat Rebalance Simulator** reallocating congested outlets across beats.
3. **Auto-Enabled Gemini Live Copilot (`/ws/live`)**:
   - Connects automatically on load via bidirectional WebSocket (`16 kHz` PCM mic capture + `24 kHz` PCM audio playback + tool-grounded Vertex AI `gemini-3.8-live` & `gemini-3.8-flash`, with English / Hinglish / Hindi toggle and automatic tool-grounded fallback when ADC is offline).
   - Voice and text turns dynamically drive the map, city benchmarks, SHAP diagnosis, beat simulator, and printable **Beat Action Pack**.

## Local Quick Start

```bash
cp .env.example .env
# Optional for real Vertex AI Gemini Live + Flash locally:
# gcloud auth application-default login

chmod +x run_local.sh
./run_local.sh
```

Then open `http://localhost:5180`.

## Running Backend Tests

```bash
cd backend
uv sync --no-config --default-index https://pypi.org/simple
.venv/bin/pytest -v
```

## Deploying to Cloud Run

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

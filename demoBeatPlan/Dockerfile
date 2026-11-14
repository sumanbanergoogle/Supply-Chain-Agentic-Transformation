# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN if [ -f package-lock.json ]; then sed -i 's|http://airlock-proxy.uplink.goog:999/npm/|https://registry.npmjs.org/|g' package-lock.json; fi && npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend Python Environment
FROM python:3.11-slim AS backend-builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock* ./
RUN uv sync --no-config --default-index https://pypi.org/simple --no-dev
COPY backend/ ./
RUN .venv/bin/python -m app.analytics.generator

# Stage 3: Final Cloud Run Production Runtime
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8080
ENV GOOGLE_GENAI_USE_VERTEXAI=TRUE

COPY --from=backend-builder /app/backend /app/backend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

WORKDIR /app/backend
EXPOSE 8080

CMD ["/app/backend/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--ws-ping-interval", "20", "--proxy-headers", "--forwarded-allow-ips", "*"]

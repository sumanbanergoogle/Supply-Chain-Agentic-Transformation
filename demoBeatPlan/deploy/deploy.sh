#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project)}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-itc-tmd-beatpulse}"

gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --set-env-vars "GOOGLE_GENAI_USE_VERTEXAI=TRUE,BEATPULSE_PROJECT_ID=${PROJECT_ID},BEATPULSE_LIVE_MODEL=gemini-3.8-live,BEATPULSE_LIVE_LOCATION=us-central1,BEATPULSE_TEXT_MODEL=gemini-3.8-flash,BEATPULSE_TEXT_LOCATION=global"

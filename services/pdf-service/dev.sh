#!/usr/bin/env bash
# Runs the pdf-service dev server, loading env vars from the repo-root .env
# (mirrors how apps/api loads it via `tsx --env-file`). Not a pnpm workspace
# member — it's a Python venv app — so it's invoked directly rather than via
# `pnpm --filter`.
set -euo pipefail
cd "$(dirname "$0")"

set -a
source ../../.env
set +a

exec .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port "${PDF_SERVICE_PORT:-8000}" --reload

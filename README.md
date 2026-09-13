# Spendy — Bank Statement Spending Analyzer

Upload a bank statement PDF, get transactions extracted and categorized by Claude,
and see a spending dashboard (category breakdown, spend over time, top merchants,
plain-language summary).

## Architecture

```
apps/web        React (Vite) + Clerk auth + recharts — the dashboard UI
apps/api        Hono (Node/TS) — auth, statement/transaction CRUD, dashboard endpoints
services/pdf-service   Python (FastAPI) — PDF decrypt/extract, Claude extraction +
                       categorization + summary, reconciliation, direct Postgres writes
db/migrations   Plain numbered SQL files, applied by apps/api's migrate script
```

Upload flow: the web app uploads directly to `apps/api`, which encrypts and stores
the PDF, creates a `statements` row, and fires an internal (token-authenticated)
HTTP call to `pdf-service` to run the full pipeline. The client never blocks on
this — it polls `GET /statements/:id` until `status` is `done` or `failed`. See
`db/migrations/001_init.sql` for the schema and inline comments in
`apps/api/src/routes/statements.ts` / `services/pdf-service/app/main.py` for the
pipeline details.

## Prerequisites

- Node.js 22+, pnpm 10+ (`corepack enable` or `npm i -g pnpm`), Python 3.12,
  Docker (for local Postgres + MinIO)
- A [Clerk](https://clerk.com) application (free tier is fine) — you need
  `CLERK_SECRET_KEY` (backend) and `VITE_CLERK_PUBLISHABLE_KEY` (frontend)
- An [Anthropic API key](https://console.anthropic.com)

## Local setup

```bash
cp .env.example .env
# fill in ANTHROPIC_API_KEY, CLERK_SECRET_KEY, VITE_CLERK_PUBLISHABLE_KEY
# generate a storage encryption key:
openssl rand -base64 32   # paste into STORAGE_ENCRYPTION_KEY

pnpm install
docker compose up -d        # Postgres + MinIO (S3-compatible, stands in for R2)
pnpm run migrate            # applies db/migrations against DATABASE_URL

pnpm run dev:api            # apps/api on :8787
```

In a second terminal, start the Python service:

```bash
cd services/pdf-service
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
set -a; source ../../.env; set +a   # export all vars from .env into this shell
uvicorn app.main:app --reload --port 8000
```

In a third terminal, start the frontend:

```bash
pnpm run dev:web              # apps/web on :5173
```

Every env var each service needs is listed (with a comment) in `.env.example`.
Both `apps/api` and `services/pdf-service` load configuration from process env —
they don't read `.env` themselves, so either `export` the vars or run them through
something that does (`dotenv`, `docker compose --env-file`, etc.) in your own shell.

### Running tests

```bash
cd services/pdf-service
pip install -r requirements-dev.txt
pytest
```

(`apps/api`/`apps/web` have no test suite yet — type-checking via `tsc --noEmit`
in each package is the current safety net.)

## Privacy & security notes (see spec §10)

- **PDF passwords are never persisted.** A statement password is only ever held
  in memory for the single request that decrypts the PDF (`POST /statements` or
  `POST /statements/:id/reprocess`) — never written to a DB row, a queue payload,
  or a log line. If processing fails for a password-protected PDF and needs a
  retry, the user re-enters the password via the reprocess endpoint.
- **Encryption at rest**: raw PDF bytes are encrypted with AES-256-GCM
  (`STORAGE_ENCRYPTION_KEY`) before being written to object storage, on top of
  whatever R2/MinIO does natively.
- **Redaction**: account/card/IBAN-like number sequences are stripped from
  extracted statement text (`services/pdf-service/app/redact.py`) before it's
  sent to Claude for extraction or categorization. Best-effort, not exhaustive —
  see the file's tests for what it does and doesn't touch (it deliberately
  leaves dates and transaction amounts alone).
- **Retention**: raw PDFs are meant to be purged 30 days after a statement
  finishes processing (`RETENTION_DAYS`), keeping only the extracted transaction
  data. Run `python -m app.retention_cleanup` on a schedule (e.g. Railway cron)
  — it's not wired up to run automatically yet.
- **Loan reminders**: two scheduled jobs (also not wired up automatically —
  run both via Railway cron, `loan_due_reminder_job` before `loan_overdue_job`
  each day) send a Telegram reminder and write an in-app `notifications` row
  when a tracked loan is due (`python -m app.loan_due_reminder_job`) and again
  once it's actually overdue (`python -m app.loan_overdue_job`). Replying to
  either reminder on Telegram — or just sending the next message, if there's
  only one loan awaiting a reply — marks the loan repaid
  (`services/telegram-bot/src/webhook.ts`).
- **Per-user isolation**: every query in `apps/api` filters by the Clerk-verified
  `userId`; `pdf-service`'s `/process` endpoint is internal-only (shared-secret
  header) and only ever acts on the `statement_id` it's given by `apps/api`.

## Deploying (Railway + Cloudflare)

This repo includes Dockerfiles for `apps/api` and `services/pdf-service` — point
a Railway service at each (`apps/api/Dockerfile`, `services/pdf-service/Dockerfile`,
both built from the repo root as build context since they need the workspace
lockfile) plus a Railway Postgres instance for `DATABASE_URL`. Deploy `apps/web`
to Cloudflare Pages (build command `pnpm --filter @spendy/web run build`, output
`apps/web/dist`). Create an R2 bucket and set `STORAGE_ENDPOINT` to its
S3-compatible endpoint. None of this is provisioned for you — it needs your own
Railway/Cloudflare/Clerk accounts and credentials.

## Known v1 limitations (see spec §2)

Text-based PDFs only (no OCR/scanned statements), single PDF upload only (no
CSV), single currency, no multi-bank template detection (relies on the LLM to
generalize), no budgets/goals/reminders, web only.

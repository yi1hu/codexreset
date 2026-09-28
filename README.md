# Codex Reset Observatory

Codex Reset Observatory is an evidence-first system for collecting, reviewing, and eventually
forecasting Codex reset signals. The current **stage 3** implementation includes the engineering
foundation plus production-oriented collection from two official public sources.

Signal classification, automatic Reset confirmation, forecasting, and the full dashboard remain
deliberately out of scope. Collected records are evidence candidates, not confirmed Reset events.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS
- Node.js worker process
- PostgreSQL 16 and Drizzle ORM
- pnpm workspace
- Docker Compose for local orchestration

## Repository layout

```text
apps/
  web/          Next.js application and health endpoint
  worker/       Scheduled collector runtime and one-shot command
packages/
  db/           Drizzle schema, connection, and migrations
  domain/       Stable domain vocabulary and types
  shared/       Shared runtime configuration
  collectors/   Source adapters, HTTP retry, ETag handling, and isolated runner
  classifier/   Classifier boundary (implementation follows later)
  forecast/     Forecast boundary (implementation follows later)
```

## Local development

Requirements:

- Node.js 22 or newer
- Corepack-enabled pnpm
- PostgreSQL 16, or Docker with Docker Compose

Install dependencies and prepare configuration:

```bash
corepack enable
pnpm install
cp .env.example .env
```

Update `.env` for your local PostgreSQL instance, then generate and apply migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

Start both processes:

```bash
pnpm dev
```

Run an immediate collection cycle without waiting for the scheduler:

```bash
pnpm collect:once
```

The web application runs at `http://localhost:3000`. Its readiness endpoint is
`http://localhost:3000/api/health`. It returns HTTP 503 when PostgreSQL is unavailable and reports
each collector as `ok`, `stale`, `down`, or `never-run` when the database is reachable.

## Collector sources

| Source | Poll interval | Stored scope | Authentication |
| --- | ---: | --- | --- |
| OpenAI Status | 5 minutes | Incident updates mentioning Codex or Work Mode | None |
| `openai/codex` GitHub Releases | 15 minutes | Published releases | Optional `GITHUB_TOKEN` |

Both collectors use conditional ETag requests, bounded retries, `Retry-After`, timeouts, and SHA-256
content hashes. The database uniqueness key `(source_id, external_id, content_hash)` makes repeated
collection idempotent while retaining a new version when upstream content changes.

The GitHub releases endpoint works without authentication for public data. Setting an optional
`GITHUB_TOKEN` only raises the API rate limit; no Codex login, browser cookie, `auth.json`, or personal
usage data is read.

## Docker Compose

After creating `.env`, start PostgreSQL, run migrations, and launch the application:

```bash
docker compose up --build
```

The compose stack limits PostgreSQL to 30 connections and uses a named volume for persistence.
Production deployments should replace local credentials, terminate TLS at the ingress, and use a
managed secret store.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Evidence and prediction boundaries

The schema separates immutable raw source material, derived signals, confirmed events, and forecast
snapshots. A forecast is never treated as confirmation of an event, and every confirmed event can be
linked back to its supporting or contradicting evidence.

## License

Released under the [MIT License](./LICENSE). See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)
for dependency and future reuse requirements.

# Codex Reset Observatory

Codex Reset Observatory is an evidence-first system for collecting, reviewing, and eventually
forecasting Codex reset signals. This repository currently contains the **stage 2 engineering
foundation**: application shells, the database schema, migrations, health checks, and container
configuration.

Collection connectors, signal classification, forecasting, and the full dashboard are deliberately
out of scope for this stage.

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
  worker/       Background-process lifecycle scaffold
packages/
  db/           Drizzle schema, connection, and migrations
  domain/       Stable domain vocabulary and types
  shared/       Shared runtime configuration
  collectors/   Collector boundary (implementation follows later)
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

The web application runs at `http://localhost:3000`. Its readiness endpoint is
`http://localhost:3000/api/health` and returns HTTP 503 until the configured database is reachable.

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

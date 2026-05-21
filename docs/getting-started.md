# Getting Started

## Prerequisites

- [Bun](https://bun.com) v1.3.12 or later
- A SwitchBot account with devices registered
- SwitchBot API token and secret key (from the SwitchBot app → Profile → Preferences → App Version, tap 10 times to enable developer mode)

## Environment Variables

| Variable | Package | Required | Description |
|----------|---------|----------|-------------|
| `SWITCHBOT_TOKEN` | api-server | Yes | SwitchBot API token |
| `SWITCHBOT_SECRET_KEY` | api-server | Yes | SwitchBot API secret key for HMAC signing |
| `PORT` | api-server | No | API server port (default: 3000) |
| `DB_PATH` | api-server | No | SQLite DB path (default: `/data/brightness.db`) |
| `API_BASE_URL` | dashboard | No | API server URL for proxy (default: `http://localhost:3000`) |



These are stored in `.env` at the project root (gitignored).

## Setup

```bash
bun install
```

Copy `.env.example` to `.env` and fill in your SwitchBot credentials:

```bash
cp .env.example .env
```

## Running

```bash
bun run api:dev          # API server with --watch
bun run api:start        # API server (production)

bun run dashboard:dev    # Dashboard with HMR
bun run dashboard:start  # Dashboard (production)
```

The API server runs on port 3000, the dashboard on port 3001. The dashboard proxies `/api/*` requests to the API server.

## Database Migrations

The API server applies Drizzle SQLite migrations automatically on startup.

After changing `packages/api-server/src/schema.ts`, generate a migration:

```bash
bun run --filter @timnoya/api-server db:generate
```

## Linting & Formatting

```bash
bun run lint             # Biome lint
bun run format           # Biome format --write
bun run check            # Biome check (lint + format)
```

## Docker

Each package has a Dockerfile:

```bash
# API server
docker build -f packages/api-server/Dockerfile .

# Dashboard
docker build -f packages/dashboard/Dockerfile .
```

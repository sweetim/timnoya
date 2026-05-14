# timnoya

Bun workspace for SwitchBot device monitoring via an ElysiaJS API server.

## Quick Start

```bash
bun install
cp .env.example .env
```

```bash
bun run api:dev
bun run dashboard:dev
```

## Workspace Packages

| Package | Description |
|---------|-------------|
| `packages/api-server` | ElysiaJS HTTP API server for SwitchBot device status |
| `packages/dashboard` | React dashboard with TailwindCSS v4, served via Bun |

## Docker

Multi-stage production build. Dependencies are installed in a shared base stage and cached across rebuilds.

```bash
docker compose up --build
```

The API runs on `http://localhost:3000` and the dashboard on `http://localhost:3001`.

## Documentation

See [docs/](./docs/) for full documentation.

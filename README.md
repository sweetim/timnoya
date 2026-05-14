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


Using docker compose from github packages

```yaml
services:
  api-server:
    image: ghcr.io/sweetim/timnoya/api-server:latest
    restart: unless-stopped
    env_file: .env

  dashboard:
    image: ghcr.io/sweetim/timnoya/dashboard:latest
    restart: unless-stopped
    environment:
      - API_BASE_URL=http://api-server:3000
    ports:
      - "3001:3001"
    depends_on:
      - api-server
```


## Documentation

See [docs/](./docs/) for full documentation.

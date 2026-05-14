# timnoya

Bun workspace for SwitchBot device monitoring via an ElysiaJS API server.

## Setup

```bash
bun install
```

Create `.env` with your SwitchBot credentials:
```
SWITCHBOT_TOKEN=your_token
SWITCHBOT_SECRET_KEY=your_secret
```

## Running

```bash
# API server
bun run api:start          # start (default port 3000)
bun run api:dev            # dev mode with watch

# Dashboard
bun run dashboard:start    # start
bun run dashboard:dev      # dev mode with HMR
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/devices` | List all SwitchBot devices |
| GET | `/devices/status` | Status of all devices |
| GET | `/devices/:deviceId/status` | Status of a single device |

## Workspace Packages

| Package | Description |
|---------|-------------|
| `packages/api-server` | ElysiaJS HTTP API server for SwitchBot device status |
| `packages/dashboard` | React dashboard with TailwindCSS v4, served via Bun |

This project was created using `bun init` in bun v1.3.12. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

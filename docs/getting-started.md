# Getting Started

## Prerequisites

- [Rust](https://rustup.rs) (latest stable)
- [Bun](https://bun.com) v1.3.12 or later (for dashboard)
- A SwitchBot account with devices registered
- SwitchBot API token and secret key (from the SwitchBot app → Profile → Preferences → App Version, tap 10 times to enable developer mode)

## Environment Variables

| Variable | Package | Required | Description |
|----------|---------|----------|-------------|
| `SWITCHBOT_TOKEN` | api-server | Yes | SwitchBot API token |
| `SWITCHBOT_SECRET_KEY` | api-server | Yes | SwitchBot API secret key for HMAC signing |
| `PORT` | api-server | No | API server port (default: 3000) |
| `DB_PATH` | api-server | No | SQLite DB path (default: `/data/brightness.db`) |
| `KITCHEN_LIGHT_DEVICE_ID` | api-server | No* | SwitchBot device ID for the Kitchen Light (required for presence automation) |
| `RUST_LOG` | api-server | No | Log level (default: `info`) |
| `API_BASE_URL` | dashboard | No | API server URL for proxy (default: `http://localhost:3000`) |

These are stored in `.env` at the project root (gitignored).

## Setup

```bash
cargo build   # Build API server
bun install   # Install dashboard deps
```

Copy `.env.example` to `.env` and fill in your SwitchBot credentials:

```bash
cp .env.example .env
```

## Running

```bash
cargo run --manifest-path packages/api-server/Cargo.toml   # API server
bun run dashboard:dev                                       # Dashboard with HMR
bun run dashboard:start                                     # Dashboard (production)
```

The API server runs on port 3000, the dashboard on port 3001. The dashboard proxies `/api/*` requests to the API server.

## Database Migrations

The API server applies SQLite migrations automatically on startup from `packages/api-server/migrations/0000_init.sql`.

## Docker

Each package has a Dockerfile:

```bash
# API server (multi-stage Rust build)
docker build -f packages/api-server/Dockerfile .

# Dashboard
docker build -f packages/dashboard/Dockerfile .
```

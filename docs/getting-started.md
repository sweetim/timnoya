# Getting Started

## Prerequisites

- [Bun](https://bun.com) v1.3.12 or later
- A SwitchBot account with devices registered
- SwitchBot API token and secret key (from the SwitchBot app → Profile → Preferences → App Version, tap 10 times to enable developer mode)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SWITCHBOT_TOKEN` | Yes | SwitchBot API token |
| `SWITCHBOT_SECRET_KEY` | Yes | SwitchBot API secret key for HMAC signing |
| `PORT` | No | API server port (default: 3000) |

These are stored in `.env` (gitignored).

## Setup

```bash
bun install
cp .env.example .env
```

## Running

```bash
bun run api:start
bun run api:dev

bun run dashboard:start
bun run dashboard:dev
```

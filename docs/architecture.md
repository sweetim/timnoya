# Architecture

## File Map

| File | Purpose |
|------|---------|
| `package.json` | Root workspace config — scripts for dev/start/lint/format/check |
| `tsconfig.json` | Root TypeScript config (shared base) |
| `biome.json` | Biome linter/formatter config |
| `AGENTS.md` | AI agent coding guidelines and conventions |
| `.env` | Environment variables (not committed) |
| `.gitignore` | Git ignore rules |
| `bun.lock` | Bun dependency lockfile |
| `packages/api-server/package.json` | API server package metadata and scripts |
| `packages/api-server/drizzle.config.ts` | Drizzle Kit config for generating SQLite migrations |
| `packages/api-server/drizzle/` | Generated Drizzle SQL migrations and schema snapshots |
| `packages/api-server/tsconfig.json` | TypeScript config for the API server |
| `packages/api-server/Dockerfile` | Docker build for API server |
| `packages/api-server/src/index.ts` | Elysia server entry point — defines routes for device status API, webhook receiver, starts light sensor polling, webhook registration, and presence automation |
| `packages/api-server/src/switchbot.ts` | SwitchBot API client — auth, device listing, status fetching, command sending, webhook management |
| `packages/api-server/src/schema.ts` | Drizzle SQLite schema definitions (sensor_readings, webhook_events, device_switch_states) |
| `packages/api-server/src/database.ts` | SQLite DB (Drizzle + bun:sqlite) — applies migrations, insert/query/switch-state helpers |
| `packages/api-server/src/light-sensor.ts` | Multi-device polling — discovers all devices with lightLevel or battery, logs readings every 10 min |
| `packages/api-server/src/presence-handler.ts` | Presence sensor automation — turns Kitchen Light on when motion detected in low light, off when undetected, persists switch state in DB |
| `packages/api-server/src/webhook.ts` | Webhook registration — checks if webhook URL is registered with SwitchBot, registers if missing |
| `packages/api-server/src/webhook.ts` | Webhook registration — checks if webhook URL is registered, registers if missing |
| `packages/dashboard/package.json` | Dashboard package metadata and scripts |
| `packages/dashboard/tsconfig.json` | TypeScript config for the dashboard (includes `@/*` path alias) |
| `packages/dashboard/Dockerfile` | Docker build for dashboard |
| `packages/dashboard/bunfig.toml` | Bun config — TailwindCSS plugin |
| `packages/dashboard/src/index.ts` | Bun.serve entry point — serves dashboard with HMR and `/api/*` proxy to API server |
| `packages/dashboard/src/index.html` | HTML entry point for the dashboard SPA |
| `packages/dashboard/src/frontend.tsx` | React DOM mount point (StrictMode + HMR-aware root) |
| `packages/dashboard/src/index.css` | Global styles — Tailwind v4 import, custom theme, glass/shimmer/badge utilities |
| `packages/dashboard/src/App.tsx` | Dashboard shell — tab navigation (Dashboard/Webhooks), fetches `/api/devices/status`, `/api/sensors/brightness`, `/api/sensors/temperature`, `/api/webhook/events`, renders Header + TemperatureHumidity + SensorReadings + DeviceGrid or WebhookEvents, auto-refreshes every 30s / 5min, persists view mode and tab in localStorage |
| `packages/dashboard/src/types.ts` | Shared types — `DeviceStatus` (with `deviceId` and `kind` fields), `StatusResponse`, `BrightnessReading`, `BrightnessHistoryResponse`, `TemperatureReading`, `TemperatureHistoryResponse`, `AggregationMode`, `WebhookEvent`, `WebhookEventsResponse`, `KNOWN_FIELDS` set (includes `deviceId`, `hubDeviceId`) |
| `packages/dashboard/src/logo.svg` | Favicon SVG |
| `packages/dashboard/src/components/DeviceCard.tsx` | Single device card — icon, name, type badge, dynamic status fields |
| `packages/dashboard/src/components/DeviceGrid.tsx` | Main content area — SummaryCard, ViewToggle, renders card/table/compact views with loading skeletons and empty/error states |
| `packages/dashboard/src/components/DeviceTable.tsx` | Table view for devices — dynamic columns for extra status fields |
| `packages/dashboard/src/components/Header.tsx` | Sticky header — logo, title, last-refresh timestamp, refresh button |
| `packages/dashboard/src/components/SkeletonCard.tsx` | Shimmer loading placeholder for card view |
| `packages/dashboard/src/components/SkeletonTable.tsx` | Shimmer loading placeholder for table view |
| `packages/dashboard/src/components/SummaryCard.tsx` | Summary stats — total device count and battery status list |
| `packages/dashboard/src/components/SensorReadings.tsx` | Line chart (recharts) showing brightness and battery history per device with aggregation toggle (raw/hourly/daily) |
| `packages/dashboard/src/components/TemperatureHumidity.tsx` | Line chart (recharts) showing temperature and humidity history per device with aggregation toggle (raw/hourly/daily) |
| `packages/dashboard/src/components/WebhookEvents.tsx` | Webhook events table with pagination and keyboard-accessible expandable payload preview |
| `packages/dashboard/src/components/ViewToggle.tsx` | View mode toggle — card/table/compact switcher |
| `packages/dashboard/src/lib/device-utils.tsx` | Device type helpers — icon/color/bg mapping, formatValue, BatteryIndicator, PositionIndicator, BooleanBadge, compactStatusIcons |

## Package Structure

```
packages/api-server/
  Dockerfile
  drizzle.config.ts        → Drizzle Kit migration generation config
  drizzle/                 → SQL migrations and Drizzle migration metadata
  src/
    index.ts                → Elysia HTTP server (routes) + starts light sensor polling
    switchbot.ts            → SwitchBot API client
      ├── buildHeaders()         → HMAC-SHA256 signed auth headers
      ├── switchbotFetch<T>()    → generic GET with auth headers
      ├── switchbotPost<T>()     → generic POST with auth headers
      ├── getDevices()           → fetch /devices, return normalized list
      ├── getDeviceStatus()      → fetch /devices/:id/status
      ├── getAllDeviceStatuses() → parallel status fetch for all devices
      ├── sendDeviceCommand()    → send command (turnOn/turnOff) to a device
      ├── getRegisteredWebhooks() → fetch current webhook registrations
      └── setupWebhook()         → register webhook URL with SwitchBot
    schema.ts               → Drizzle schema for sensor_readings (nullable brightness, temperature, humidity, battery), webhook_events (raw payload + parsed fields), device_switch_states (device_id PK, power state)
    database.ts             → SQLite DB via Drizzle + bun:sqlite, runs migrations on startup
      ├── insertReading()        → insert a brightness/battery reading
      ├── insertSensorReading()  → insert a temperature/humidity sensor reading
      ├── getBrightnessHistory() → query recent sensor readings (legacy, with limit)
      ├── getAggregatedHistory() → query aggregated brightness/battery history by raw/hourly/daily mode
      ├── getTemperatureHistory() → query aggregated temperature/humidity history by raw/hourly/daily mode
      ├── insertWebhookEvent()   → insert a parsed webhook event
      ├── getWebhookHistory()    → query recent webhook events
      ├── getSwitchState()       → get current switch power state for a device
      └── upsertSwitchState()    → insert or update switch power state for a device
    light-sensor.ts         → Multi-device lightLevel|battery polling
      ├── findLightBatteryDevices() → discover all devices with lightLevel or battery fields
      ├── updateBatteries()         → refresh cached battery for each device
      ├── logReadings()             → fetch status + write to DB for each device
      └── startLightSensorPolling() → discover devices, start 10-min/24h intervals
    webhook.ts              → Webhook registration on startup
      └── ensureWebhook()          → check if webhook URL is registered, register if missing
    presence-handler.ts     → Presence sensor automation
      ├── initSwitchStates()        → ensure Kitchen Light switch state row exists in DB (default off)
      └── handlePresenceEvent()     → on DETECTED + lightLevel<=5 turn on Kitchen Light; on NOT_DETECTED turn off

packages/dashboard/
  Dockerfile
  bunfig.toml                → TailwindCSS plugin config
  tsconfig.json              → @/* path alias → ./src/*
  src/
    index.ts                 → Bun.serve with HTML routes, HMR, and /api/* proxy
    index.html               → SPA entry (imports frontend.tsx)
    frontend.tsx             → React DOM createRoot mount (HMR-aware)
    index.css                → Tailwind v4, custom theme, glass/shimmer/badge styles
    App.tsx                  → Dashboard shell — data fetching, auto-refresh, view mode persistence
    types.ts                 → DeviceStatus (with deviceId/kind), StatusResponse, BrightnessReading,
                               BrightnessHistoryResponse, TemperatureReading,
                               TemperatureHistoryResponse, KNOWN_FIELDS
    logo.svg                 → Favicon
    components/
      Header.tsx             → Sticky header with refresh button
      DeviceGrid.tsx         → Main content — SummaryCard, ViewToggle, card/table/compact views
      DeviceCard.tsx         → Device card with icon, badge, dynamic status fields
      DeviceTable.tsx        → Table view with dynamic columns for extra status fields
      SummaryCard.tsx        → Total device count and battery status list
      ViewToggle.tsx         → Card/table/compact view mode toggle
      SkeletonCard.tsx       → Shimmer loading placeholder (card)
      SkeletonTable.tsx      → Shimmer loading placeholder (table)
      SensorReadings.tsx     → Line chart (recharts) with per-device brightness toggle and aggregation mode selector
      TemperatureHumidity.tsx → Line chart (recharts) with per-device temperature/humidity toggle and aggregation mode selector
    lib/
      device-utils.tsx       → Icon/color mapping (ts-pattern), formatValue with
                               BatteryIndicator, PositionIndicator, BooleanBadge,
                               compactStatusIcons
```

## Key Dependencies

### Root (`package.json`)

| Dependency | Purpose |
|------------|---------|
| `@biomejs/biome` | Linting and formatting |
| `@types/bun` | Bun type definitions |
| `typescript` | TypeScript compiler (peer) |

### API Server (`packages/api-server`)

| Dependency | Purpose |
|------------|---------|
| `drizzle-kit` | Generates SQL migrations from Drizzle schemas |
| `drizzle-orm` | Typed SQLite ORM/query builder |
| `elysia` | HTTP framework |

### Dashboard (`packages/dashboard`)

| Dependency | Purpose |
|------------|---------|
| `react` / `react-dom` | UI framework |
| `tailwindcss` | Utility-first CSS (v4) |
| `bun-plugin-tailwind` | Tailwind plugin for Bun bundler |
| `lucide-react` | Icon library |
| `ts-pattern` | Pattern matching |
| `recharts` | Charting library (line charts for sensor readings) |

## Environment Variables

| Variable | Package | Required | Description |
|----------|---------|----------|-------------|
| `SWITCHBOT_TOKEN` | api-server | Yes | SwitchBot API token |
| `SWITCHBOT_SECRET_KEY` | api-server | Yes | SwitchBot API secret key for HMAC signing |
| `PORT` | api-server | No | API server port (default: 3000) |
| `DB_PATH` | api-server | No | SQLite DB path (default: `/data/brightness.db`) |
| `KITCHEN_LIGHT_DEVICE_ID` | api-server | No* | SwitchBot device ID for the Kitchen Light (required for presence automation) |
| `API_BASE_URL` | dashboard | No | API server URL for proxy (default: `http://localhost:3000`) |
| `NODE_ENV` | dashboard | No | Set to `production` to disable HMR |

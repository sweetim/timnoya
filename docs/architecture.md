# Architecture

## File Map

| File | Purpose |
|------|---------|
| `package.json` | Root workspace config — scripts for dashboard dev/start/lint/format/check |
| `tsconfig.json` | Root TypeScript config (shared base for dashboard) |
| `biome.json` | Biome linter/formatter config |
| `AGENTS.md` | AI agent coding guidelines and conventions |
| `.env` | Environment variables (not committed) |
| `.gitignore` | Git ignore rules |
| `packages/api-server/Cargo.toml` | Rust project config and dependencies |
| `packages/api-server/Dockerfile` | Multi-stage Docker build for Rust API server |
| `packages/api-server/migrations/0000_init.sql` | SQLite schema (sensor_readings, webhook_events, device_switch_states, switch_log) |
| `packages/api-server/migrations/0001_brightness_real_and_indices.sql` | Migration — converts brightness TEXT→REAL, adds indices |
| `packages/api-server/src/main.rs` | Axum HTTP server entry point — startup, route wiring, background tasks |
| `packages/api-server/src/error.rs` | AppError enum (thiserror) with axum IntoResponse — structured HTTP error responses |
| `packages/api-server/src/state.rs` | AppState struct — shared state (DbPool, SwitchBotClient, kitchen_light_device_id) |
| `packages/api-server/src/switchbot.rs` | SwitchBot API client — HMAC-SHA256 auth, parallel device status fetching, 30s timeout, command sending, webhook management |
| `packages/api-server/src/schema.rs` | Serde structs for database rows (SensorReading, WebhookEvent, DeviceSwitchState, SwitchLogEntry, AggregatedRow, TemperatureRow) |
| `packages/api-server/src/database.rs` | SQLite via r2d2 pool + rusqlite — migration runner, insert/query/switch-state helpers (get_conn! macro) |
| `packages/api-server/src/handlers/mod.rs` | Handler module re-exports + shared PaginationQuery |
| `packages/api-server/src/handlers/devices.rs` | Device handlers — GET /devices, /devices/status, /devices/{id}/status |
| `packages/api-server/src/handlers/sensors.rs` | Sensor handlers — GET /sensors/brightness, /sensors/temperature (spawn_blocking for DB) |
| `packages/api-server/src/handlers/webhooks.rs` | Webhook handlers — POST /webhook/switchbot (inbound), GET /webhook/events (spawn_blocking for DB) |
| `packages/api-server/src/handlers/switches.rs` | Switch handlers — GET /switches, /switches/log (spawn_blocking for DB) |
| `packages/api-server/src/light_sensor.rs` | Multi-device polling — parallel discovery, logs readings every 10 min |
| `packages/api-server/src/presence_handler.rs` | Presence sensor automation — turns Kitchen Light on/off with spawn_blocking for DB |
| `packages/api-server/src/webhook.rs` | Webhook registration — checks if webhook URL (WEBHOOK_URL env) is registered, registers if missing |
| `packages/api-server/src/logger.rs` | tracing-subscriber init with env-filter (reads RUST_LOG) |
| `packages/dashboard/package.json` | Dashboard package metadata and scripts |
| `packages/dashboard/tsconfig.json` | TypeScript config for the dashboard (includes `@/*` path alias) |
| `packages/dashboard/Dockerfile` | Docker build for dashboard |
| `packages/dashboard/bunfig.toml` | Bun config — TailwindCSS plugin |
| `packages/dashboard/src/index.ts` | Bun.serve entry point — serves dashboard with HMR and `/api/*` proxy to API server |
| `packages/dashboard/src/index.html` | HTML entry point for the dashboard SPA |
| `packages/dashboard/src/frontend.tsx` | React DOM mount point (StrictMode + HMR-aware root) |
| `packages/dashboard/src/index.css` | Global styles — Tailwind v4 import, custom theme, glass/shimmer/badge utilities |
| `packages/dashboard/src/App.tsx` | Dashboard shell — tab navigation (Dashboard/Webhooks/Switches), fetches `/api/devices/status`, `/api/sensors/brightness`, `/api/sensors/temperature`, `/api/webhook/events`, `/api/switches`, `/api/switches/log`, renders Header + TemperatureHumidity + SensorReadings + DeviceGrid or WebhookEvents or SwitchStatus, auto-refreshes every 30s / 5min, persists view mode and tab in localStorage |
| `packages/dashboard/src/types.ts` | Shared types — `DeviceStatus` (with `deviceId` and `kind` fields), `StatusResponse`, `BrightnessReading`, `BrightnessHistoryResponse`, `TemperatureReading`, `TemperatureHistoryResponse`, `AggregationMode`, `WebhookEvent`, `WebhookEventsResponse`, `SwitchState`, `SwitchesResponse`, `SwitchLogEntry`, `SwitchLogResponse`, `KNOWN_FIELDS` set (includes `deviceId`, `hubDeviceId`) |
| `packages/dashboard/src/logo.svg` | Favicon SVG |
| `packages/dashboard/src/components/DeviceCard.tsx` | Single device card — icon, name, type badge, dynamic status fields |
| `packages/dashboard/src/components/DeviceGrid.tsx` | Main content area — SummaryCard, ViewToggle, renders card/table/compact views with loading skeletons and empty/error states |
| `packages/dashboard/src/components/DeviceTable.tsx` | Table view for devices — dynamic columns for extra status fields |
| `packages/dashboard/src/components/Header.tsx` | Sticky header — logo, title, last-refresh timestamp, refresh button |
| `packages/dashboard/src/components/SkeletonCard.tsx` | Shimmer loading placeholder for card view |
| `packages/dashboard/src/components/SkeletonTable.tsx` | Shimmer loading placeholder for table view |
| `packages/dashboard/src/components/SummaryCard.tsx` | Summary stats — total device count and battery status list |
| `packages/dashboard/src/components/SensorReadings.tsx` | Line chart (recharts) showing brightness and battery history per device with aggregation toggle (raw/hourly/daily) |
| `packages/dashboard/src/components/SwitchStatus.tsx` | Switch status cards (on/off) and switch toggle log table with action/reason columns |
| `packages/dashboard/src/components/TemperatureHumidity.tsx` | Line chart (recharts) showing temperature and humidity history per device with aggregation toggle (raw/hourly/daily) |
| `packages/dashboard/src/components/WebhookEvents.tsx` | Webhook events table with pagination and keyboard-accessible expandable payload preview |
| `packages/dashboard/src/components/ViewToggle.tsx` | View mode toggle — card/table/compact switcher |
| `packages/dashboard/src/lib/device-utils.tsx` | Device type helpers — icon/color/bg mapping, formatValue, BatteryIndicator, PositionIndicator, BooleanBadge, compactStatusIcons |

## Package Structure

```
packages/api-server/
  Cargo.toml                 → Rust project config and dependencies
  Dockerfile                 → Multi-stage Rust Docker build
  migrations/
    0000_init.sql            → SQLite schema (idempotent CREATE TABLE IF NOT EXISTS)
    0001_brightness_real_and_indices.sql → Convert brightness TEXT→REAL, add indices
  src/
    main.rs                  → Axum HTTP server startup, route wiring, background tasks
    error.rs                 → AppError enum (thiserror + IntoResponse)
    state.rs                 → AppState struct (DbPool, SwitchBotClient, kitchen_light_device_id)
    switchbot.rs             → SwitchBot API client
      ├── build_headers()         → HMAC-SHA256 signed auth headers
      ├── switchbot_get<T>()      → generic GET with auth headers
      ├── switchbot_post<T>()     → generic POST with auth headers
      ├── get_devices()           → fetch /devices, return normalized list
      ├── get_device_status()     → fetch /devices/:id/status
      ├── get_all_device_statuses() → parallel status fetch for all devices (futures::join_all)
      ├── send_device_command()   → send command (turnOn/turnOff) to a device
      ├── get_registered_webhooks() → fetch current webhook registrations
      └── setup_webhook()         → register webhook URL with SwitchBot
    schema.rs                → Serde structs for sensor_readings, webhook_events, device_switch_states, switch_log
    database.rs              → SQLite DB via r2d2 pool + rusqlite, migration runner, get_conn! macro
      ├── init_db()                 → create pool, run versioned migrations
      ├── insert_reading()        → insert a brightness/battery reading
      ├── insert_sensor_reading()  → insert a temperature/humidity sensor reading
      ├── get_brightness_history() → query recent sensor readings (legacy, with limit)
      ├── get_aggregated_history() → query aggregated brightness/battery history by raw/hourly/daily mode
      ├── get_temperature_history() → query aggregated temperature/humidity history by raw/hourly/daily mode
      ├── insert_webhook_event()   → insert a parsed webhook event
      ├── get_webhook_history()    → query recent webhook events
      ├── get_all_switch_states()   → get all current switch power states
      ├── insert_switch_log()      → insert a switch toggle event
      ├── get_switch_log()         → query switch toggle log
      ├── get_switch_state()       → get current switch power state for a device
      └── upsert_switch_state()    → insert or update switch power state for a device
    handlers/
      mod.rs                  → Re-exports + shared PaginationQuery
      devices.rs              → GET /devices, /devices/status, /devices/{id}/status
      sensors.rs              → GET /sensors/brightness, /sensors/temperature (spawn_blocking)
      webhooks.rs             → POST /webhook/switchbot, GET /webhook/events (spawn_blocking)
      switches.rs             → GET /switches, /switches/log (spawn_blocking)
    light_sensor.rs          → Multi-device lightLevel|battery polling (parallel fetch)
      ├── find_light_battery_devices() → discover all devices with lightLevel or battery fields (parallel)
      ├── update_batteries()         → refresh cached battery for each device (parallel)
      ├── log_readings()             → fetch status + write to DB for each device (parallel)
      └── start_light_sensor_polling() → discover devices, start 10-min/24h intervals
    webhook.rs               → Webhook registration on startup (WEBHOOK_URL env var)
      └── ensure_webhook()          → check if webhook URL is registered, register if missing
    presence_handler.rs      → Presence sensor automation (spawn_blocking for DB)
      ├── init_switch_states()        → ensure Kitchen Light switch state row exists in DB (default off)
      └── handle_presence_event()     → on DETECTED + lightLevel<=5 turn on Kitchen Light; on NOT_DETECTED turn off
    logger.rs                → tracing-subscriber init with env-filter (RUST_LOG)

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
                               TemperatureHistoryResponse, SwitchState, SwitchLogEntry, KNOWN_FIELDS
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
      SwitchStatus.tsx        → Switch state cards (on/off) and toggle log table
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
| `axum` | Async HTTP framework |
| `tokio` | Async runtime |
| `rusqlite` | SQLite bindings (bundled) |
| `r2d2` / `r2d2_sqlite` | Connection pooling |
| `reqwest` | HTTP client for SwitchBot API |
| `serde` / `serde_json` | JSON serialization |
| `tracing` / `tracing-subscriber` | Structured logging |
| `hmac` / `sha2` | HMAC-SHA256 signing for SwitchBot auth |
| `uuid` | Nonce generation for SwitchBot auth |
| `chrono` | Timestamps for SwitchBot auth |
| `base64` | Base64 encoding for SwitchBot auth signature |
| `dotenvy` | .env file loading |
| `tower-http` | HTTP middleware (tracing) |
| `thiserror` | Derived error types with Display/From |
| `futures` | Async utilities (join_all for parallel fetching) |

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
| `RUST_LOG` | api-server | No | Log level (default: `info`) |
| `WEBHOOK_URL` | api-server | No | Webhook endpoint URL (default: `https://webhooks.timx.co/webhook/switchbot`) |
| `STATIC_DIR` | api-server | No | Static files directory (default: `/app/dist`) |
| `API_BASE_URL` | dashboard | No | API server URL for proxy (default: `http://localhost:3000`) |
| `NODE_ENV` | dashboard | No | Set to `production` to disable HMR |

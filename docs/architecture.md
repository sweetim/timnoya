# Architecture

## File Map

| File | Purpose |
|------|---------|
| `package.json` | Root workspace config — scripts for dashboard dev/start/lint/format/check |
| `tsconfig.json` | Root TypeScript config (shared base for dashboard) |
| `biome.json` | Biome linter/formatter config |
| `AGENTS.md` | AI agent coding guidelines and conventions |
| `.env` | Environment variables (not committed) |
| `.env.example` | Example environment variables for SwitchBot, Tapo, API, and dashboard setup |
| `.gitignore` | Git ignore rules |
| `packages/api-server/Cargo.toml` | Rust project config and dependencies |
| `packages/api-server/Dockerfile` | Multi-stage Docker build for Rust API server |
| `packages/api-server/migrations/0000_init.sql` | SQLite schema (sensor_readings, webhook_events, device_switch_states, switch_log) |
| `packages/api-server/migrations/0001_brightness_real_and_indices.sql` | Migration — converts brightness TEXT→REAL, adds indices |
| `packages/api-server/migrations/0002_add_power_watts.sql` | Migration — adds `power_watts` to `sensor_readings` for Tapo P110 data |
| `packages/api-server/src/main.rs` | Axum HTTP server entry point — startup, route wiring, background tasks, graceful shutdown |
| `packages/api-server/src/error.rs` | AppError + SwitchBotError enums (thiserror) with axum IntoResponse — structured HTTP error responses |
| `packages/api-server/src/state.rs` | AppState struct — shared state (DbPool, SwitchBotClient, kitchen_light_device_id) |
| `packages/api-server/src/switchbot.rs` | SwitchBot API client — HMAC-SHA256 auth (HeaderMap), concurrency-limited parallel status fetching, 30s timeout, command sending, webhook management |
| `packages/api-server/src/schema.rs` | Serde structs for database rows (WebhookEvent, DeviceSwitchState, SwitchLogEntry, AggregatedRow, TemperatureRow, PowerRow) |
| `packages/api-server/src/db/mod.rs` | SQLite via r2d2 pool + rusqlite — DbPool type, migration runner, get_conn helper, query_rows macro |
| `packages/api-server/src/db/sensors.rs` | Sensor DB — insert_reading, insert_sensor_reading, insert_power_reading, get_aggregated_history, get_temperature_history, get_power_history (parameterized SQL) |
| `packages/api-server/src/db/webhooks.rs` | Webhook DB — insert_webhook_event, get_webhook_history |
| `packages/api-server/src/db/switches.rs` | Switch DB — get_switch_state, upsert_switch_state, get_all_switch_states, insert_switch_log, get_switch_log |
| `packages/api-server/src/handlers/mod.rs` | Handler module re-exports + shared PaginationQuery |
| `packages/api-server/src/handlers/devices.rs` | Device handlers — GET /devices, /devices/status, /devices/{id}/status |
| `packages/api-server/src/handlers/sensors.rs` | Sensor handlers — GET /sensors/brightness, /sensors/temperature, /sensors/power (typed responses, spawn_blocking for DB) |
| `packages/api-server/src/handlers/webhooks.rs` | Webhook handlers — POST /webhook/switchbot (event dispatcher), GET /webhook/events (spawn_blocking for DB) |
| `packages/api-server/src/handlers/switches.rs` | Switch handlers — GET /switches, /switches/log (spawn_blocking for DB) |
| `packages/api-server/src/light_sensor.rs` | Multi-device polling — parallel discovery, logs readings every 10 min |
| `packages/api-server/src/tapo_poller.rs` | Tapo P110 polling — reads current power every 10 min using `TAPO_USERNAME`, `TAPO_PASSWORD`, `TAPO_P110_IP` |
| `packages/api-server/src/presence_handler.rs` | Presence sensor automation — turns Kitchen Light on/off with spawn_blocking for DB |
| `packages/api-server/src/webhook.rs` | Webhook registration — checks if webhook URL (WEBHOOK_URL env) is registered, registers if missing (spawn_blocking for DB) |
| `packages/api-server/src/logger.rs` | tracing-subscriber init with env-filter (reads RUST_LOG) |
| `packages/dashboard/package.json` | Dashboard package metadata and scripts |
| `packages/dashboard/tsconfig.json` | TypeScript config for the dashboard (includes `@/*` path alias) |
| `packages/dashboard/Dockerfile` | Docker build for dashboard |
| `packages/dashboard/bunfig.toml` | Bun config — TailwindCSS plugin |
| `packages/dashboard/src/index.ts` | Bun.serve entry point — serves dashboard with HMR and `/api/*` proxy to API server |
| `packages/dashboard/src/index.html` | HTML entry point for the dashboard SPA |
| `packages/dashboard/src/frontend.tsx` | React DOM mount point (StrictMode + HMR-aware root) |
| `packages/dashboard/src/index.css` | Global styles — Tailwind v4 import, custom theme, glass/shimmer/badge utilities |
| `packages/dashboard/src/App.tsx` | Dashboard shell — tab navigation (Dashboard/Webhooks/Switches), fetches `/api/devices/status`, `/api/sensors/brightness`, daily battery history from `/api/sensors/brightness?aggregation=daily`, `/api/sensors/temperature`, `/api/sensors/power`, `/api/webhook/events`, `/api/switches`, `/api/switches/log`, renders Header + TemperatureHumidity + PowerUsage + SensorReadings + BatteryLevel + DeviceGrid or WebhookEvents or SwitchStatus, auto-refreshes every 30s / 5min, persists view mode and tab in localStorage |
| `packages/dashboard/src/types.ts` | Shared types — `DeviceStatus` (with `deviceId` and `kind` fields), `StatusResponse`, `BrightnessReading`, `BrightnessHistoryResponse`, `TemperatureReading`, `TemperatureHistoryResponse`, `PowerReading`, `PowerHistoryResponse`, `AggregationMode`, `WebhookEvent`, `WebhookEventsResponse`, `SwitchState`, `SwitchesResponse`, `SwitchLogEntry`, `SwitchLogResponse`, `KNOWN_FIELDS` set (includes `deviceId`, `hubDeviceId`) |
| `packages/dashboard/src/logo.svg` | Favicon SVG |
| `packages/dashboard/src/components/DeviceCard.tsx` | Single device card — icon, name, type badge, dynamic status fields |
| `packages/dashboard/src/components/DeviceGrid.tsx` | Main content area — SummaryCard, ViewToggle, renders card/table/compact views with loading skeletons and empty/error states |
| `packages/dashboard/src/components/DeviceTable.tsx` | Table view for devices — dynamic columns for extra status fields |
| `packages/dashboard/src/components/Header.tsx` | Sticky header — logo, title, last-refresh timestamp, refresh button |
| `packages/dashboard/src/components/SkeletonCard.tsx` | Shimmer loading placeholder for card view |
| `packages/dashboard/src/components/SkeletonTable.tsx` | Shimmer loading placeholder for table view |
| `packages/dashboard/src/components/SummaryCard.tsx` | Summary stats — total device count and battery status list |
| `packages/dashboard/src/components/SensorReadings.tsx` | Line chart (recharts) showing brightness history per device with aggregation toggle (raw/hourly/daily) |
| `packages/dashboard/src/components/BatteryLevel.tsx` | Line chart (recharts) showing battery history per device as daily 90-day data only |
| `packages/dashboard/src/components/PowerUsage.tsx` | Line chart (recharts) showing Tapo P110 power usage with aggregation toggle (raw/hourly/daily) |
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
    0002_add_power_watts.sql → Add power_watts for Tapo P110 readings
  src/
    main.rs                  → Axum HTTP server startup, route wiring, background tasks, graceful shutdown
    error.rs                 → AppError + SwitchBotError enums (thiserror + IntoResponse)
    state.rs                 → AppState struct (DbPool, SwitchBotClient, kitchen_light_device_id)
    switchbot.rs             → SwitchBot API client (HeaderMap auth, concurrency semaphore)
      ├── build_headers()         → HMAC-SHA256 signed auth headers (HeaderMap)
      ├── switchbot_get<T>()      → generic GET with auth headers
      ├── switchbot_post<T>()     → generic POST with auth headers
      ├── get_devices()           → fetch /devices, return normalized list
      ├── get_device_status()     → fetch /devices/:id/status
      ├── get_all_device_statuses() → parallel status fetch (semaphore-limited futures::join_all)
      ├── send_device_command()   → send command (turnOn/turnOff) to a device
      ├── get_registered_webhooks() → fetch current webhook registrations
      └── setup_webhook()         → register webhook URL with SwitchBot
    schema.rs                → Serde structs for webhook_events, device_switch_states, switch_log, aggregated/temperature/power rows
    db/
      mod.rs                 → DbPool type, init_db, migration runner, get_conn, query_rows! macro
      sensors.rs             → insert_reading, insert_sensor_reading, insert_power_reading, get_aggregated_history, get_temperature_history, get_power_history
      webhooks.rs            → insert_webhook_event, get_webhook_history
      switches.rs            → get_switch_state, upsert_switch_state, get_all_switch_states, insert_switch_log, get_switch_log
    handlers/
      mod.rs                  → Re-exports + shared PaginationQuery
      devices.rs              → GET /devices, /devices/status, /devices/{id}/status
      sensors.rs              → GET /sensors/brightness, /sensors/temperature, /sensors/power (typed responses, spawn_blocking)
      webhooks.rs             → POST /webhook/switchbot (event dispatcher), GET /webhook/events (spawn_blocking)
      switches.rs             → GET /switches, /switches/log (spawn_blocking)
    light_sensor.rs          → Multi-device lightLevel|battery polling (parallel fetch)
      ├── find_light_battery_devices() → discover all devices with lightLevel or battery fields (parallel)
      ├── update_batteries()         → refresh battery for each device (parallel)
      ├── log_readings()             → fetch status + write to DB for each device (parallel)
      └── start_light_sensor_polling() → discover devices, start 10-min/24h intervals
    tapo_poller.rs           → Tapo P110 current power polling every 10 min
      ├── start_tapo_power_polling() → start polling when TAPO_* env vars are present
      └── log_power()                → read current power and write to DB
    webhook.rs               → Webhook registration on startup (WEBHOOK_URL env var, spawn_blocking for DB)
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
                               TemperatureHistoryResponse, PowerReading, PowerHistoryResponse,
                               SwitchState, SwitchLogEntry, KNOWN_FIELDS
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
      PowerUsage.tsx         → Line chart (recharts) with Tapo P110 power usage and aggregation mode selector
      SensorReadings.tsx     → Line chart (recharts) with per-device brightness toggle and aggregation mode selector
      BatteryLevel.tsx       → Line chart (recharts) with per-device battery levels as daily 90-day data only
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
| `tapo` | TP-Link Tapo P110 local API client for current power readings |

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
| `TAPO_USERNAME` | api-server | No | Tapo account username for P110 power polling; polling is disabled if missing |
| `TAPO_PASSWORD` | api-server | No | Tapo account password for P110 power polling; polling is disabled if missing |
| `TAPO_P110_IP` | api-server | No | Local IP address of the Tapo P110; polling is disabled if missing |
| `RUST_LOG` | api-server | No | Log level (default: `info`) |
| `WEBHOOK_URL` | api-server | No | Webhook endpoint URL (default: `https://webhooks.timx.co/webhook/switchbot`) |
| `STATIC_DIR` | api-server | No | Static files directory (default: `/app/dist`) |
| `API_BASE_URL` | dashboard | No | API server URL for proxy (default: `http://localhost:3000`) |
| `NODE_ENV` | dashboard | No | Set to `production` to disable HMR |

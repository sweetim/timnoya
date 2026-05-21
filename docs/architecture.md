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
| `packages/api-server/tsconfig.json` | TypeScript config for the API server |
| `packages/api-server/Dockerfile` | Docker build for API server |
| `packages/api-server/src/index.ts` | Elysia server entry point — defines routes for device status API, starts presence sensor polling |
| `packages/api-server/src/switchbot.ts` | SwitchBot API client — auth, device listing, status fetching |
| `packages/api-server/src/database.ts` | SQLite DB (bun:sqlite) — brightness_logs table, insert/query helpers |
| `packages/api-server/src/presence-sensor.ts` | Presence Sensor polling — finds device, logs brightness every 10 min |
| `packages/dashboard/package.json` | Dashboard package metadata and scripts |
| `packages/dashboard/tsconfig.json` | TypeScript config for the dashboard (includes `@/*` path alias) |
| `packages/dashboard/Dockerfile` | Docker build for dashboard |
| `packages/dashboard/bunfig.toml` | Bun config — TailwindCSS plugin |
| `packages/dashboard/src/index.ts` | Bun.serve entry point — serves dashboard with HMR and `/api/*` proxy to API server |
| `packages/dashboard/src/index.html` | HTML entry point for the dashboard SPA |
| `packages/dashboard/src/frontend.tsx` | React DOM mount point (StrictMode + HMR-aware root) |
| `packages/dashboard/src/index.css` | Global styles — Tailwind v4 import, custom theme, glass/shimmer/badge utilities |
| `packages/dashboard/src/App.tsx` | Dashboard shell — fetches `/api/devices/status`, renders Header + DeviceGrid, auto-refreshes every 30s, persists view mode in localStorage |
| `packages/dashboard/src/types.ts` | Shared types — `DeviceStatus` (with `kind` field), `StatusResponse`, `KNOWN_FIELDS` set (includes `deviceId`, `hubDeviceId`) |
| `packages/dashboard/src/logo.svg` | Favicon SVG |
| `packages/dashboard/src/components/DeviceCard.tsx` | Single device card — icon, name, type badge, dynamic status fields |
| `packages/dashboard/src/components/DeviceGrid.tsx` | Main content area — SummaryCard, ViewToggle, renders card/table/compact views with loading skeletons and empty/error states |
| `packages/dashboard/src/components/DeviceTable.tsx` | Table view for devices — dynamic columns for extra status fields |
| `packages/dashboard/src/components/Header.tsx` | Sticky header — logo, title, last-refresh timestamp, refresh button |
| `packages/dashboard/src/components/SkeletonCard.tsx` | Shimmer loading placeholder for card view |
| `packages/dashboard/src/components/SkeletonTable.tsx` | Shimmer loading placeholder for table view |
| `packages/dashboard/src/components/SummaryCard.tsx` | Summary stats — total device count and battery status list |
| `packages/dashboard/src/components/ViewToggle.tsx` | View mode toggle — card/table/compact switcher |
| `packages/dashboard/src/lib/device-utils.tsx` | Device type helpers — icon/color/bg mapping, formatValue, BatteryIndicator, PositionIndicator, BooleanBadge, compactStatusIcons |

## Package Structure

```
packages/api-server/
  Dockerfile
  src/
    index.ts                → Elysia HTTP server (routes) + starts presence sensor polling
    switchbot.ts            → SwitchBot API client
      ├── buildHeaders()         → HMAC-SHA256 signed auth headers
      ├── switchbotFetch<T>()    → generic GET with auth headers
      ├── getDevices()           → fetch /devices, return normalized list
      ├── getDeviceStatus()      → fetch /devices/:id/status
      └── getAllDeviceStatuses() → parallel status fetch for all devices
    database.ts             → SQLite DB via bun:sqlite
      ├── insertBrightness()     → insert a brightness reading
      └── getBrightnessHistory() → query recent brightness logs
    presence-sensor.ts      → Presence Sensor brightness polling
      ├── findPresenceSensor()   → find device by name/type
      ├── logBrightness()        → fetch status + write to DB
      └── startPresenceSensorPolling() → start 10-min interval

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
    types.ts                 → DeviceStatus (with kind), StatusResponse, KNOWN_FIELDS
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
| `elysia` | HTTP framework |

### Dashboard (`packages/dashboard`)

| Dependency | Purpose |
|------------|---------|
| `react` / `react-dom` | UI framework |
| `tailwindcss` | Utility-first CSS (v4) |
| `bun-plugin-tailwind` | Tailwind plugin for Bun bundler |
| `lucide-react` | Icon library |
| `ts-pattern` | Pattern matching |

## Environment Variables

| Variable | Package | Required | Description |
|----------|---------|----------|-------------|
| `SWITCHBOT_TOKEN` | api-server | Yes | SwitchBot API token |
| `SWITCHBOT_SECRET_KEY` | api-server | Yes | SwitchBot API secret key for HMAC signing |
| `PORT` | api-server | No | API server port (default: 3000) |
| `API_BASE_URL` | dashboard | No | API server URL for proxy (default: `http://localhost:3000`) |
| `NODE_ENV` | dashboard | No | Set to `production` to disable HMR |

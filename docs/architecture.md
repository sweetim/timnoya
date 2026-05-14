# Architecture

## File Map

| File | Purpose |
|------|---------|
| `packages/api-server/src/index.ts` | Elysia server entry point — defines routes for device status API |
| `packages/api-server/src/switchbot.ts` | SwitchBot API client — auth, device listing, status fetching |
| `packages/api-server/package.json` | API server package metadata and scripts |
| `packages/api-server/tsconfig.json` | TypeScript config for the API server |
| `packages/dashboard/src/index.ts` | Bun.serve entry point — serves dashboard with HMR and `/api/*` proxy to API server |
| `packages/dashboard/src/index.html` | HTML entry point for the dashboard SPA |
| `packages/dashboard/src/frontend.tsx` | React DOM mount point |
| `packages/dashboard/src/App.tsx` | Dashboard UI — device cards, status visualization |
| `packages/dashboard/bunfig.toml` | Bun config — TailwindCSS plugin |
| `packages/dashboard/package.json` | Dashboard package metadata and scripts |
| `package.json` | Root workspace config |
| `tsconfig.json` | Root TypeScript config |
| `AGENTS.md` | AI agent coding guidelines and conventions |
| `.env` | Environment variables (not committed) |
| `.gitignore` | Git ignore rules |
| `bun.lock` | Bun dependency lockfile |

## Package Structure

```
packages/api-server/
  src/
    index.ts           → Elysia HTTP server (routes)
    switchbot.ts       → SwitchBot API client
      ├── buildHeaders()       → HMAC-SHA256 signed auth headers
      ├── getDevices()         → fetch /devices, return normalized list
      ├── getDeviceStatus()    → fetch /devices/:id/status
      └── getAllDeviceStatuses() → parallel status fetch for all devices

packages/dashboard/
  src/
    index.ts            → Bun.serve with HTML routes, HMR, and /api/* proxy
    index.html          → SPA entry (imports tailwindcss + frontend.tsx)
    frontend.tsx        → React DOM createRoot mount
    App.tsx             → Dashboard UI — device status cards
  bunfig.toml           → TailwindCSS plugin config
```

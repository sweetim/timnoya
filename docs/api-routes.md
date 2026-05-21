# API Routes

Internal HTTP routes served by the Elysia API server.

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/devices` | List all SwitchBot devices (physical + infrared) |
| GET | `/devices/status` | Fetch and return status for all devices |
| GET | `/devices/:deviceId/status` | Fetch and return status for a specific device |
| GET | `/presence-sensor/brightness` | Query brightness history (optional `?limit=N`, default 100) |

## Usage

```bash
curl http://localhost:3000/devices
curl http://localhost:3000/devices/status
curl http://localhost:3000/devices/<deviceId>/status
curl http://localhost:3000/presence-sensor/brightness
curl http://localhost:3000/presence-sensor/brightness?limit=50
```

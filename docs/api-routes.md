# API Routes

Internal HTTP routes served by the Elysia API server.

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/devices` | List all SwitchBot devices (physical + infrared) |
| GET | `/devices/status` | Fetch and return status for all devices |
| GET | `/devices/:deviceId/status` | Fetch and return status for a specific device |

## Usage

```bash
curl http://localhost:3000/devices
curl http://localhost:3000/devices/status
curl http://localhost:3000/devices/<deviceId>/status
```

# API Routes

Internal HTTP routes served by the Elysia API server.

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/devices` | List all SwitchBot devices (physical + infrared) |
| GET | `/devices/status` | Fetch and return status for all devices |
| GET | `/devices/:deviceId/status` | Fetch and return status for a specific device |
| GET | `/sensors/brightness` | Query brightness/battery history with optional aggregation |
| POST | `/webhook/switchbot` | Receive SwitchBot webhook events and store to DB |
| GET | `/webhook/events` | Query stored webhook events |

## `/sensors/brightness` Query Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `aggregation` | `raw`, `hourly`, `daily` | *(legacy mode)* | Aggregation mode with auto-selected time range |
| `limit` | number | 100 | Only used when `aggregation` is omitted (legacy mode) |

### Aggregation Modes

| Mode | Time Range | Granularity | Description |
|------|-----------|-------------|-------------|
| `raw` | Last 24 hours | Per-reading (~10 min) | Recent detail view |
| `hourly` | Last 7 days | Hourly averages | Weekly trends |
| `daily` | Last 90 days | Daily averages | Long-term patterns |

## Usage

```bash
curl http://localhost:3000/devices
curl http://localhost:3000/devices/status
curl http://localhost:3000/devices/<deviceId>/status
curl http://localhost:3000/sensors/brightness
curl http://localhost:3000/sensors/brightness?limit=50
curl http://localhost:3000/sensors/brightness?aggregation=raw
curl http://localhost:3000/sensors/brightness?aggregation=hourly
curl http://localhost:3000/sensors/brightness?aggregation=daily
```

## `/webhook/events` Query Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `limit` | number | 100 | Maximum number of events to return |

## `/webhook/switchbot` Webhook Receiver

Receives `changeReport` events from SwitchBot. On server startup, `ensureWebhook()` checks if `https://webhooks.timx.co/webhook/switchbot` is already registered with SwitchBot; if not, it registers it with `deviceList: "ALL"`.

Incoming payload shape:
```json
{
  "eventType": "changeReport",
  "eventVersion": "1",
  "context": {
    "deviceType": "WoCurtain",
    "deviceMac": "xx:xx:xx:xx:xx:xx",
    "...": "other device-specific fields"
  }
}
```

### Usage

```bash
curl http://localhost:3000/webhook/events
curl http://localhost:3000/webhook/events?limit=50
```

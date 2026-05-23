# SwitchBot API Reference

Base URL: `https://api.switch-bot.com/v1.1`

Full API documentation: [github.com/OpenWonderLabs/SwitchBotAPI](https://github.com/OpenWonderLabs/SwitchBotAPI)

## Limits

- Personal use only; commercial use requires contacting SwitchBot
- **10,000 API calls per day** — exceeding this returns "Unauthorized"

## Authentication

Every request requires HMAC-SHA256 signed headers. The signing procedure:

1. Generate a 13-digit millisecond timestamp
2. Concatenate `token + timestamp + nonce`
3. Compute HMAC-SHA256 of that string using the secret key
4. Base64-encode the result

| Header | Value |
|--------|-------|
| `Authorization` | SwitchBot open token |
| `sign` | Base64-encoded HMAC-SHA256 signature |
| `nonce` | Random UUID |
| `t` | 13-digit millisecond timestamp |
| `Content-Type` | `application/json` |

Implemented in `packages/api-server/src/switchbot.ts` → `buildHeaders()`.

### Obtaining the Token and Secret Key

1. Download the SwitchBot app (App Store or Google Play)
2. Register/log in to your SwitchBot account
3. For app version >= V9.0: go to **Profile > Preferences > About**, tap **App Version** 10 times to reveal Developer Options, then tap **Get Token**
4. For app version < V9.0: go to **Profile > Preferences**, tap **App Version** 10 times
5. Both the token and secret key are displayed (requires app V6.14+ for the secret key)

## Standard Error Codes

| Code | Name | Description |
|------|------|-------------|
| 100 | Success | Request succeeded |
| 400 | Bad Request | Invalid request or validation error |
| 401 | Unauthorized | Invalid token or rate limit exceeded |
| 190 | System error | Device state not synchronized with server |

## Endpoints Used

### GET /devices

Lists all devices registered with the SwitchBot account. Includes both physical devices and virtual infrared remote devices.

**Response shape:**

```typescript
{
  statusCode: number;
  message: string;
  body: {
    deviceList: {
      deviceId: string;
      deviceType: string;
      deviceName: string;
      enableCloudService: boolean;
      hubDeviceId: string;
    }[];
    infraredRemoteList: {
      deviceId: string;
      deviceName: string;
      remoteType: string;
      hubDeviceId: string;
    }[];
  };
}
```

A successful response has `statusCode === 100`.

### GET /devices/{deviceId}/status

Fetches the status of a specific device. The response body shape varies by device type, so it is handled as `Record<string, unknown>`.

**Response shape:**

```typescript
{
  statusCode: number;
  body: Record<string, unknown>;
}
```

### POST /devices/{deviceId}/commands

Send a control command to a device.

**Request body:**

```json
{
  "command": "turnOn" | "turnOff" | ...,
  "parameter": "default",
  "commandType": "command"
}
```

**Response:**

```typescript
{
  statusCode: number;
  message: string;
  body: {};
}
```

Implemented in `packages/api-server/src/switchbot.ts` → `sendDeviceCommand()`.

## Available Endpoints (Not Yet Used)

These endpoints are available in the SwitchBot API v1.1 but not currently used by this project:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1.1/scenes` | GET | List all scenes |
| `/v1.1/scenes/{sceneId}/execute` | POST | Execute a manual scene |
| `/v1.1/webhook/updateWebhook` | POST | Update webhook configuration |
| `/v1.1/webhook/deleteWebhook` | POST | Delete a webhook |

## Webhook Endpoints (Used)

These webhook endpoints are used by the project:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1.1/webhook/setupWebhook` | POST | Register a webhook URL — used by `ensureWebhook()` on startup |
| `/v1.1/webhook/queryWebhook` | POST | Query existing webhook URLs (action: `queryUrl`) — used to check if webhook is already registered |

### POST /webhook/queryWebhook (queryUrl)

**Request body:**

```json
{ "action": "queryUrl" }
```

**Response:**

```typescript
{
  statusCode: number;
  message: string;
  body: { urls: string[] };
}
```

### POST /webhook/setupWebhook

**Request body:**

```json
{ "action": "setupWebhook", "url": "...", "deviceList": "ALL" }
```

**Response:**

```typescript
{
  statusCode: number;
  message: string;
  body: {};
}
```

## Types

### Internal DeviceStatus

`GET /devices/status` combines the SwitchBot device list with per-device status responses. `deviceId` is copied from `/devices`, so it is present even if an individual status request fails.

```typescript
type DeviceStatus = {
  deviceId: string;
  name: string;
  type: string;
  kind: "physical" | "infrared";
  error?: boolean;
} & Record<string, unknown>;
```

### Curtain3Status

```typescript
type Curtain3Status = {
  deviceId: string;
  deviceType: string;
  hubDeviceId: string;
  calibrate: boolean;
  group: boolean;
  moving: boolean;
  battery: number;
  version: string;
  slidePosition: string;
};
```

| Field | Description |
|-------|-------------|
| `slidePosition` | Current curtain position as a percentage string (e.g. `"0"` = closed, `"100"` = open) |
| `moving` | Whether the curtain is currently in motion |
| `calibrate` | Whether the open/close positions have been calibrated |
| `group` | Whether the device is paired/grouped with another Curtain 3 |
| `battery` | Battery level (0–100) |
| `version` | Firmware version |
| `hubDeviceId` | Parent Hub device ID (`"000000000000"` if connected via Wi-Fi) |

### Curtain3 Device List Entry

When listed in the `/devices` response, Curtain 3 entries also include:

| Field | Description |
|-------|-------------|
| `curtainDevicesIds` | Array of paired/grouped Curtain device IDs |
| `master` | Whether this is the master device in a group |
| `openDirection` | The opening direction of the curtain |

### WebhookEvent

```typescript
type WebhookEvent = {
  id: number;
  timestamp: string;
  event_type: string;
  event_version: string | null;
  device_type: string | null;
  device_mac: string | null;
  payload: string;
}
```

| Field | Description |
|-------|-------------|
| `event_type` | Type of event (e.g. `changeReport`) |
| `event_version` | Event version string |
| `device_type` | SwitchBot device type (e.g. `WoCurtain`) |
| `device_mac` | Device MAC address |
| `payload` | Full JSON payload as received from SwitchBot |

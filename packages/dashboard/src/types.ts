export type DeviceStatus = {
  deviceId: string
  name: string
  type: string
  kind: "physical" | "infrared"
  error?: boolean
} & Record<string, unknown>

export type StatusResponse = {
  statuses: DeviceStatus[]
}

export type BrightnessReading = {
  id?: number
  timestamp: string
  device_id: string
  device_name: string
  brightness: string | number | null
  battery: number | null
}

export type AggregationMode = "raw" | "hourly" | "daily"

export type BrightnessHistoryResponse = {
  history: BrightnessReading[]
}

export const KNOWN_FIELDS = new Set([
  "name",
  "type",
  "kind",
  "error",
  "deviceId",
  "hubDeviceId",
])

export type WebhookEvent = {
  id: number
  timestamp: string
  event_type: string
  event_version: string | null
  device_type: string | null
  device_mac: string | null
  payload: string
}

export type WebhookEventsResponse = {
  events: WebhookEvent[]
}

export type TemperatureReading = {
  timestamp: string
  device_id: string
  device_name: string
  temperature: number | null
  humidity: number | null
}

export type TemperatureHistoryResponse = {
  history: TemperatureReading[]
}

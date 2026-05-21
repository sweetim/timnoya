export type DeviceStatus = {
  name: string
  type: string
  kind: "physical" | "infrared"
  error?: boolean
} & Record<string, unknown>

export type StatusResponse = {
  statuses: DeviceStatus[]
}

export type BrightnessReading = {
  id: number
  timestamp: string
  device_id: string
  device_name: string
  brightness: string
  battery: number | null
}

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

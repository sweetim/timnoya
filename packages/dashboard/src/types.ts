export type DeviceStatus = {
  name: string
  type: string
  kind: "physical" | "infrared"
  error?: boolean
} & Record<string, unknown>

export type StatusResponse = {
  statuses: DeviceStatus[]
}

export const KNOWN_FIELDS = new Set([
  "name",
  "type",
  "kind",
  "error",
  "deviceId",
  "hubDeviceId",
])

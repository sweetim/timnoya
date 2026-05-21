import { insertBrightness } from "./database"
import { getDeviceStatus, getDevices } from "./switchbot"

const POLL_INTERVAL_MS = 10 * 60 * 1000

async function findPresenceSensor(): Promise<string | null> {
  const devices = await getDevices()
  const sensor = devices.find(
    (d) =>
      d.deviceName.toLowerCase().includes("presence")
      || d.deviceType.toLowerCase().includes("presence"),
  )
  return sensor?.deviceId ?? null
}

async function logBrightness(): Promise<void> {
  try {
    const deviceId = await findPresenceSensor()
    if (!deviceId) {
      console.error("[presence-sensor] No Presence Sensor device found")
      return
    }

    const status = await getDeviceStatus(deviceId)
    const brightness = String(status.brightness ?? "unknown")
    insertBrightness(brightness)
    console.log(
      `[presence-sensor] Logged brightness: ${brightness} at ${new Date().toISOString()}`,
    )
  } catch (error) {
    console.error("[presence-sensor] Failed to log brightness:", error)
  }
}

export function startPresenceSensorPolling(): void {
  logBrightness()
  setInterval(logBrightness, POLL_INTERVAL_MS)
}

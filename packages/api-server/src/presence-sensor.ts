import { insertReading } from "./database"
import { type Device, getDeviceStatus, getDevices } from "./switchbot"

const POLL_INTERVAL_MS = 10 * 60 * 1000

async function findPresenceSensor(): Promise<Device | null> {
  const devices = await getDevices()
  return (
    devices.find(
      (d) =>
        d.deviceName.toLowerCase().includes("presence")
        || d.deviceType.toLowerCase().includes("presence"),
    ) ?? null
  )
}

async function logBrightness(): Promise<void> {
  try {
    const sensor = await findPresenceSensor()
    if (!sensor) {
      console.error("[presence-sensor] No Presence Sensor device found")
      return
    }

    const status = await getDeviceStatus(sensor.deviceId)
    const brightness = String(status.brightness ?? "unknown")
    const battery = typeof status.battery === "number" ? status.battery : null
    insertReading(sensor.deviceId, sensor.deviceName, brightness, battery)
    console.log(
      `[presence-sensor] Logged brightness: ${brightness}, battery: ${battery} at ${new Date().toISOString()}`,
    )
  } catch (error) {
    console.error("[presence-sensor] Failed to log brightness:", error)
  }
}

export function startPresenceSensorPolling(): void {
  logBrightness()
  setInterval(logBrightness, POLL_INTERVAL_MS)
}

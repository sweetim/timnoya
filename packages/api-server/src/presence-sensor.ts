import { insertReading } from "./database"
import { type Device, getDeviceStatus, getDevices } from "./switchbot"

const BRIGHTNESS_INTERVAL_MS = 10 * 60 * 1000
const BATTERY_INTERVAL_MS = 24 * 60 * 60 * 1000

const batteryByDevice = new Map<string, number>()
let matchingDevices: Device[] = []

async function findBrightnessDevices(): Promise<Device[]> {
  const devices = await getDevices()
  const results: Device[] = []

  await Promise.all(
    devices.map(async (device) => {
      try {
        const status = await getDeviceStatus(device.deviceId)
        if ("lightLevel" in status && "battery" in status) {
          results.push(device)
          if (typeof status.battery === "number") {
            batteryByDevice.set(device.deviceId, status.battery)
          }
        }
      } catch {
        // skip devices that fail status check
      }
    }),
  )

  return results
}

async function updateBatteries(): Promise<void> {
  for (const device of matchingDevices) {
    try {
      const status = await getDeviceStatus(device.deviceId)
      if (typeof status.battery === "number") {
        batteryByDevice.set(device.deviceId, status.battery)
      }
      console.log(
        `[presence-sensor] Updated battery for ${device.deviceName}: ${batteryByDevice.get(device.deviceId) ?? null} at ${new Date().toISOString()}`,
      )
    } catch (error) {
      console.error(
        `[presence-sensor] Failed to update battery for ${device.deviceName}:`,
        error,
      )
    }
  }
}

async function logBrightness(): Promise<void> {
  for (const device of matchingDevices) {
    try {
      const status = await getDeviceStatus(device.deviceId)
      const brightness = String(status.lightLevel ?? "unknown")
      const battery = batteryByDevice.get(device.deviceId) ?? null
      insertReading(device.deviceId, device.deviceName, brightness, battery)
      console.log(
        `[presence-sensor] Logged brightness for ${device.deviceName}: ${brightness}, battery: ${battery} at ${new Date().toISOString()}`,
      )
    } catch (error) {
      console.error(
        `[presence-sensor] Failed to log brightness for ${device.deviceName}:`,
        error,
      )
    }
  }
}

export function startPresenceSensorPolling(): void {
  findBrightnessDevices().then((devices) => {
    matchingDevices = devices
    console.log(
      `[presence-sensor] Found ${devices.length} device(s) with lightLevel+battery: ${devices.map((d) => d.deviceName).join(", ")}`,
    )
    logBrightness()
    updateBatteries()
    setInterval(logBrightness, BRIGHTNESS_INTERVAL_MS)
    setInterval(updateBatteries, BATTERY_INTERVAL_MS)
  })
}

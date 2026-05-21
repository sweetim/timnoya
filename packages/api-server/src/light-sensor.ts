import { insertReading } from "./database"
import { type Device, getDeviceStatus, getDevices } from "./switchbot"

const BRIGHTNESS_INTERVAL_MS = 10 * 60 * 1000
const BATTERY_INTERVAL_MS = 24 * 60 * 60 * 1000

const batteryByDevice = new Map<string, number>()
let matchingDevices: Device[] = []

async function findLightBatteryDevices(): Promise<Device[]> {
  const devices = await getDevices()
  const results: Device[] = []

  await Promise.all(
    devices.map(async (device) => {
      try {
        const status = await getDeviceStatus(device.deviceId)
        if ("lightLevel" in status || "battery" in status) {
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
        insertReading(device.deviceId, device.deviceName, null, status.battery)
      }
      console.log(
        `[light-sensor] Updated battery for ${device.deviceName}: ${batteryByDevice.get(device.deviceId) ?? null} at ${new Date().toISOString()}`,
      )
    } catch (error) {
      console.error(
        `[light-sensor] Failed to update battery for ${device.deviceName}:`,
        error,
      )
    }
  }
}

async function logReadings(): Promise<void> {
  for (const device of matchingDevices) {
    try {
      const status = await getDeviceStatus(device.deviceId)
      const brightness =
        status.lightLevel != null ? String(status.lightLevel) : null
      insertReading(device.deviceId, device.deviceName, brightness, null)
      console.log(
        `[light-sensor] Logged reading for ${device.deviceName}: brightness=${brightness} at ${new Date().toISOString()}`,
      )
    } catch (error) {
      console.error(
        `[light-sensor] Failed to log reading for ${device.deviceName}:`,
        error,
      )
    }
  }
}

export function startLightSensorPolling(): void {
  findLightBatteryDevices().then((devices) => {
    matchingDevices = devices
    console.log(
      `[light-sensor] Found ${devices.length} device(s) with lightLevel|battery: ${devices.map((d) => d.deviceName).join(", ")}`,
    )
    logReadings()
    updateBatteries()
    setInterval(logReadings, BRIGHTNESS_INTERVAL_MS)
    setInterval(updateBatteries, BATTERY_INTERVAL_MS)
  })
}

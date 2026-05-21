import { Elysia } from "elysia"
import { getBrightnessHistory } from "./database"
import { startLightSensorPolling } from "./light-sensor"
import { getAllDeviceStatuses, getDeviceStatus, getDevices } from "./switchbot"

const app = new Elysia()
  .get("/devices", async () => {
    const devices = await getDevices()
    return { devices }
  })
  .get("/devices/status", async () => {
    const statuses = await getAllDeviceStatuses()
    return { statuses }
  })
  .get("/devices/:deviceId/status", async ({ params }) => {
    const status = await getDeviceStatus(params.deviceId)
    return { status }
  })
  .get("/sensors/brightness", ({ query }) => {
    const limit = query.limit ? Number(query.limit) : 100
    return { history: getBrightnessHistory(limit) }
  })
  .listen(process.env.PORT ? Number(process.env.PORT) : 3000)

startLightSensorPolling()

console.log(`API server running at http://localhost:${app.server?.port}`)

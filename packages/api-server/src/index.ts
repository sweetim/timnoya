import { Elysia } from "elysia"
import { getBrightnessHistory } from "./database"
import { startPresenceSensorPolling } from "./presence-sensor"
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
  .get("/presence-sensor/brightness", ({ query }) => {
    const limit = query.limit ? Number(query.limit) : 100
    return { history: getBrightnessHistory(limit) }
  })
  .listen(process.env.PORT ? Number(process.env.PORT) : 3000)

startPresenceSensorPolling()

console.log(`API server running at http://localhost:${app.server?.port}`)

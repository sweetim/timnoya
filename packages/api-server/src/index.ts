import { Elysia } from "elysia"
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
  .listen(process.env.PORT ? Number(process.env.PORT) : 3000)

console.log(`API server running at http://localhost:${app.server?.port}`)

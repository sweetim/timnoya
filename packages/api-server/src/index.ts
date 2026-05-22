import { Elysia } from "elysia"
import {
  type AggregationMode,
  getAggregatedHistory,
  getBrightnessHistory,
} from "./database"
import { startLightSensorPolling } from "./light-sensor"
import { getAllDeviceStatuses, getDeviceStatus, getDevices } from "./switchbot"

const VALID_AGGREGATIONS = new Set<string>(["raw", "hourly", "daily"])

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
    const aggregation = query.aggregation
    if (aggregation && VALID_AGGREGATIONS.has(aggregation)) {
      return { history: getAggregatedHistory(aggregation as AggregationMode) }
    }
    const limit = query.limit ? Number(query.limit) : 100
    return { history: getBrightnessHistory(limit) }
  })
  .listen(process.env.PORT ? Number(process.env.PORT) : 3000)

startLightSensorPolling()

console.log(`API server running at http://localhost:${app.server?.port}`)

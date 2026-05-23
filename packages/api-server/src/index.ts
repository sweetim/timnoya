import { Elysia } from "elysia"
import {
  type AggregationMode,
  getAggregatedHistory,
  getBrightnessHistory,
  getWebhookHistory,
  insertWebhookEvent,
} from "./database"
import { startLightSensorPolling } from "./light-sensor"
import { createLogger } from "./logger"
import { getAllDeviceStatuses, getDeviceStatus, getDevices } from "./switchbot"
import { ensureWebhook } from "./webhook"

const log = createLogger("server")

const VALID_AGGREGATIONS = new Set<string>(["raw", "hourly", "daily"])

const app = new Elysia()
  .onRequest(({ request }) => {
    log.debug(`${request.method} ${new URL(request.url).pathname}`)
  })
  .onError(({ request, error }) => {
    log.error(`${request.method} ${new URL(request.url).pathname} - ${error}`)
  })
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
  .post("/webhook/switchbot", async ({ body }) => {
    const payload = body as Record<string, unknown>
    const context = payload.context as Record<string, unknown> | undefined

    insertWebhookEvent(
      String(payload.eventType ?? "unknown"),
      payload.eventVersion ? String(payload.eventVersion) : null,
      context?.deviceType ? String(context.deviceType) : null,
      context?.deviceMac ? String(context.deviceMac) : null,
      JSON.stringify(payload),
    )

    log.info(`Received event: ${payload.eventType} device=${context?.deviceMac ?? "unknown"}`)

    return { statusCode: 100, message: "success" }
  })
  .get("/webhook/events", ({ query }) => {
    const limit = query.limit ? Number(query.limit) : 100
    return { events: getWebhookHistory(limit) }
  })
  .listen(process.env.PORT ? Number(process.env.PORT) : 3000)

startLightSensorPolling()
ensureWebhook()

log.info(`API server running at http://localhost:${app.server?.port}`)

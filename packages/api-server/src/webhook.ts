import { insertWebhookEvent } from "./database"
import { createLogger } from "./logger"
import { getRegisteredWebhooks, setupWebhook } from "./switchbot"

const log = createLogger("webhook")

const WEBHOOK_URL = "https://webhooks.timx.co/webhook/switchbot"

export async function ensureWebhook(): Promise<void> {
  try {
    const webhooks = await getRegisteredWebhooks()
    const alreadyRegistered = webhooks.some((url) => url === WEBHOOK_URL)

    if (alreadyRegistered) {
      log.info(`${WEBHOOK_URL} already registered, skipping`)
      return
    }

    const response = await setupWebhook(WEBHOOK_URL)
    insertWebhookEvent(
      "webhookRegistered",
      null,
      null,
      null,
      JSON.stringify({
        request: { url: WEBHOOK_URL, deviceList: "ALL" },
        response,
      }),
    )
    log.info(`Registered ${WEBHOOK_URL} for all devices`)
  } catch (error) {
    log.error("Failed to ensure webhook:", error)
  }
}

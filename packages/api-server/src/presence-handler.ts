import { getSwitchState, upsertSwitchState } from "./database"
import { createLogger } from "./logger"
import { sendDeviceCommand } from "./switchbot"

const log = createLogger("presence-handler")

const KITCHEN_LIGHT_DEVICE_ID = process.env.KITCHEN_LIGHT_DEVICE_ID ?? ""
const KITCHEN_LIGHT_DEVICE_NAME = "Kitchen Light"
const LIGHT_LEVEL_THRESHOLD = 5

export function initSwitchStates(): void {
  if (!KITCHEN_LIGHT_DEVICE_ID) {
    log.warn("KITCHEN_LIGHT_DEVICE_ID not set, presence automation disabled")
    return
  }

  const existing = getSwitchState(KITCHEN_LIGHT_DEVICE_ID)
  if (!existing) {
    upsertSwitchState(KITCHEN_LIGHT_DEVICE_ID, KITCHEN_LIGHT_DEVICE_NAME, "off")
    log.info(
      `Initialized switch state for ${KITCHEN_LIGHT_DEVICE_NAME} (${KITCHEN_LIGHT_DEVICE_ID}) as off`,
    )
  } else {
    log.info(
      `Switch state for ${KITCHEN_LIGHT_DEVICE_NAME} (${KITCHEN_LIGHT_DEVICE_ID}): ${existing.power}`,
    )
  }
}

type PresenceContext = {
  detectionState?: string
  lightLevel?: number
  deviceMac?: string
  deviceType?: string
}

export async function handlePresenceEvent(
  context: PresenceContext,
): Promise<void> {
  if (!KITCHEN_LIGHT_DEVICE_ID) return

  const detectionState = context.detectionState
  if (!detectionState) return

  const currentState = getSwitchState(KITCHEN_LIGHT_DEVICE_ID)
  const currentPower = currentState?.power ?? "off"

  if (detectionState === "DETECTED") {
    const lightLevel = context.lightLevel
    if (lightLevel === undefined || lightLevel > LIGHT_LEVEL_THRESHOLD) {
      log.info(
        `DETECTED but lightLevel=${lightLevel} > ${LIGHT_LEVEL_THRESHOLD}, skipping`,
      )
      return
    }

    if (currentPower === "on") {
      log.info("DETECTED but kitchen light already on, skipping")
      return
    }

    log.info(
      `DETECTED with lightLevel=${lightLevel} <= ${LIGHT_LEVEL_THRESHOLD}, turning on kitchen light`,
    )
    try {
      await sendDeviceCommand(KITCHEN_LIGHT_DEVICE_ID, "turnOn")
      upsertSwitchState(
        KITCHEN_LIGHT_DEVICE_ID,
        KITCHEN_LIGHT_DEVICE_NAME,
        "on",
      )
      log.info("Kitchen light turned on, state updated")
    } catch (error) {
      log.error("Failed to turn on kitchen light:", error)
    }
  } else if (detectionState === "NOT_DETECTED") {
    if (currentPower === "off") {
      log.info("NOT_DETECTED but kitchen light already off, skipping")
      return
    }

    log.info("NOT_DETECTED, turning off kitchen light")
    try {
      await sendDeviceCommand(KITCHEN_LIGHT_DEVICE_ID, "turnOff")
      upsertSwitchState(
        KITCHEN_LIGHT_DEVICE_ID,
        KITCHEN_LIGHT_DEVICE_NAME,
        "off",
      )
      log.info("Kitchen light turned off, state updated")
    } catch (error) {
      log.error("Failed to turn off kitchen light:", error)
    }
  }
}

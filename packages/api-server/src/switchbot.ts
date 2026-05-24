import { createHmac } from "node:crypto"
import { createLogger } from "./logger"

const log = createLogger("switchbot")

const token = process.env.SWITCHBOT_TOKEN as string
const secret = process.env.SWITCHBOT_SECRET_KEY as string
const BASE_URL = "https://api.switch-bot.com/v1.1"

function buildHeaders() {
  const timestamp = Date.now()
  const nonce = crypto.randomUUID()
  const sign = createHmac("sha256", secret)
    .update(token + timestamp + nonce)
    .digest("base64")

  return {
    Authorization: token,
    sign,
    nonce,
    t: timestamp.toString(),
    "Content-Type": "application/json",
  }
}

type SwitchBotResponse<T> = {
  statusCode: number
  message: string
  body: T
}

type DeviceListEntry = {
  deviceId: string
  deviceType: string
  deviceName: string
  enableCloudService: boolean
  hubDeviceId: string
}

type InfraredRemoteListEntry = {
  deviceId: string
  deviceName: string
  remoteType: string
  hubDeviceId: string
}

export type Device = {
  deviceId: string
  deviceType: string
  deviceName: string
  kind: "physical" | "infrared"
}

export type DeviceStatus = {
  deviceId: string
  name: string
  type: string
  kind: "physical" | "infrared"
} & Record<string, unknown>

async function switchbotFetch<T>(path: string): Promise<SwitchBotResponse<T>> {
  log.debug(`GET ${path}`)
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: buildHeaders(),
  })
  const data = (await response.json()) as SwitchBotResponse<T>
  log.debug(`GET ${path} -> statusCode=${data.statusCode}`)
  return data
}

async function switchbotPost<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<SwitchBotResponse<T>> {
  log.debug(`POST ${path}`)
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  })
  const data = (await response.json()) as SwitchBotResponse<T>
  log.debug(`POST ${path} -> statusCode=${data.statusCode}`)
  return data
}

export async function getDevices(): Promise<Device[]> {
  const data = await switchbotFetch<{
    deviceList: DeviceListEntry[]
    infraredRemoteList: InfraredRemoteListEntry[]
  }>("/devices")

  if (data.statusCode !== 100) {
    const error = `SwitchBot API error: ${data.statusCode} - ${data.message}`
    log.error(error)
    throw new Error(error)
  }

  return [
    ...data.body.deviceList.map((d) => ({
      deviceId: d.deviceId,
      deviceType: d.deviceType,
      deviceName: d.deviceName,
      kind: "physical" as const,
    })),
    ...data.body.infraredRemoteList.map((d) => ({
      deviceId: d.deviceId,
      deviceType: d.remoteType,
      deviceName: d.deviceName,
      kind: "infrared" as const,
    })),
  ]
}

export async function getDeviceStatus(
  deviceId: string,
): Promise<Record<string, unknown>> {
  const data = await switchbotFetch<Record<string, unknown>>(
    `/devices/${deviceId}/status`,
  )

  if (data.statusCode !== 100) {
    const error = `SwitchBot API error for device ${deviceId}: ${data.statusCode} - ${data.message}`
    log.error(error)
    throw new Error(error)
  }

  return data.body
}

export async function getAllDeviceStatuses(): Promise<DeviceStatus[]> {
  const devices = await getDevices()

  const physicalStatuses = await Promise.all(
    devices
      .filter((device) => device.kind !== "infrared")
      .map(async (device) => {
        try {
          const status = await getDeviceStatus(device.deviceId)
          return {
            ...status,
            deviceId: device.deviceId,
            name: device.deviceName,
            type: device.deviceType,
            kind: device.kind,
          }
        } catch (error) {
          log.warn(`Failed to get status for ${device.deviceName}:`, error)
          return {
            deviceId: device.deviceId,
            name: device.deviceName,
            type: device.deviceType,
            kind: device.kind,
            error: true,
          }
        }
      }),
  )

  const infraredDevices = devices
    .filter((device) => device.kind === "infrared")
    .map((device) => ({
      deviceId: device.deviceId,
      name: device.deviceName,
      type: device.deviceType,
      kind: device.kind as "infrared",
    }))

  return [...physicalStatuses, ...infraredDevices]
}

export async function getRegisteredWebhooks(): Promise<string[]> {
  const data = await switchbotPost<{ urls: string[] }>(
    "/webhook/queryWebhook",
    { action: "queryUrl" },
  )

  if (data.statusCode === 190) {
    return []
  }

  if (data.statusCode !== 100) {
    const error = `SwitchBot queryWebhook error: ${data.statusCode} - ${data.message}`
    log.error(error)
    throw new Error(error)
  }

  return data.body.urls ?? []
}

export async function sendDeviceCommand(
  deviceId: string,
  command: string,
  parameter?: string,
): Promise<{ statusCode: number; message: string }> {
  const body: Record<string, unknown> = {
    command,
    parameter: parameter ?? "default",
    commandType: "command",
  }

  const data = await switchbotPost<null>(`/devices/${deviceId}/commands`, body)

  if (data.statusCode !== 100) {
    const error = `SwitchBot command error for ${deviceId}: ${data.statusCode} - ${data.message}`
    log.error(error)
    throw new Error(error)
  }

  return { statusCode: data.statusCode, message: data.message }
}

export async function setupWebhook(
  url: string,
): Promise<{ statusCode: number; message: string; body: unknown }> {
  const data = await switchbotPost<null>("/webhook/setupWebhook", {
    action: "setupWebhook",
    url,
    deviceList: "ALL",
  })

  if (data.statusCode !== 100) {
    const error = `SwitchBot setupWebhook error: ${data.statusCode} - ${data.message}`
    log.error(error)
    throw new Error(error)
  }

  return { statusCode: data.statusCode, message: data.message, body: data.body }
}

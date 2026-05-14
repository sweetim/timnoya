import { createHmac } from "node:crypto";

const token = process.env.SWITCHBOT_TOKEN!;
const secret = process.env.SWITCHBOT_SECRET_KEY!;
const BASE_URL = "https://api.switch-bot.com/v1.1";

function buildHeaders() {
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();
  const sign = createHmac("sha256", secret)
    .update(token + timestamp + nonce)
    .digest("base64");

  return {
    Authorization: token,
    sign,
    nonce,
    t: timestamp.toString(),
    "Content-Type": "application/json",
  };
}

type SwitchBotResponse<T> = {
  statusCode: number;
  message: string;
  body: T;
};

type DeviceListEntry = {
  deviceId: string;
  deviceType: string;
  deviceName: string;
  enableCloudService: boolean;
  hubDeviceId: string;
};

type InfraredRemoteListEntry = {
  deviceId: string;
  deviceName: string;
  remoteType: string;
  hubDeviceId: string;
};

export type Device = {
  deviceId: string;
  deviceType: string;
  deviceName: string;
  kind: "physical" | "infrared";
};

export type DeviceStatus = {
  name: string;
  type: string;
  kind: "physical" | "infrared";
} & Record<string, unknown>;

async function switchbotFetch<T>(path: string): Promise<SwitchBotResponse<T>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: buildHeaders(),
  });
  return response.json() as Promise<SwitchBotResponse<T>>;
}

export async function getDevices(): Promise<Device[]> {
  const data = await switchbotFetch<{
    deviceList: DeviceListEntry[];
    infraredRemoteList: InfraredRemoteListEntry[];
  }>("/devices");

  if (data.statusCode !== 100) {
    throw new Error(`SwitchBot API error: ${data.statusCode} - ${data.message}`);
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
  ];
}

export async function getDeviceStatus(deviceId: string): Promise<Record<string, unknown>> {
  const data = await switchbotFetch<Record<string, unknown>>(
    `/devices/${deviceId}/status`,
  );

  if (data.statusCode !== 100) {
    throw new Error(`SwitchBot API error: ${data.statusCode} - ${data.message}`);
  }

  return data.body;
}

export async function getAllDeviceStatuses(): Promise<DeviceStatus[]> {
  const devices = await getDevices();

  const statuses = await Promise.all(
    devices.map(async (device) => {
      try {
        const status = await getDeviceStatus(device.deviceId);
        return {
          name: device.deviceName,
          type: device.deviceType,
          kind: device.kind,
          ...status,
        };
      } catch {
        return {
          name: device.deviceName,
          type: device.deviceType,
          kind: device.kind,
          error: true,
        };
      }
    }),
  );

  return statuses;
}

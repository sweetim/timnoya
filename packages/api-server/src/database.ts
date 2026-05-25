import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { desc, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { createLogger } from "./logger"
import {
  type DeviceSwitchState,
  deviceSwitchStates,
  type SensorReading,
  type SwitchLogEntry,
  sensorReadings,
  switchLog,
  type WebhookEvent,
  webhookEvents,
} from "./schema"

const log = createLogger("database")

const databasePath = process.env.DB_PATH || "/data/brightness.db"

mkdirSync(dirname(databasePath), { recursive: true })
log.info(`Opening database at ${databasePath}`)

const sqliteDatabase = new Database(databasePath, { create: true })
sqliteDatabase.exec("PRAGMA journal_mode=WAL")

const database = drizzle(sqliteDatabase)
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url))

migrate(database, { migrationsFolder })
log.info(`Database migrated from ${migrationsFolder}`)

export type AggregationMode = "raw" | "hourly" | "daily"

const AGGREGATION_CONFIG: Record<
  AggregationMode,
  { timeRange: string; strftimeFormat: string }
> = {
  raw: { timeRange: "-24 hours", strftimeFormat: "%Y-%m-%d %H:%M" },
  hourly: { timeRange: "-7 days", strftimeFormat: "%Y-%m-%d %H:00" },
  daily: { timeRange: "-90 days", strftimeFormat: "%Y-%m-%d" },
}

export function insertReading(
  deviceId: string,
  deviceName: string,
  brightness: string | null,
  battery: number | null,
): void {
  try {
    database
      .insert(sensorReadings)
      .values({
        device_id: deviceId,
        device_name: deviceName,
        brightness,
        battery,
      })
      .run()
  } catch (error) {
    log.error(`Failed to insert reading for ${deviceName}:`, error)
  }
}

export function insertSensorReading(
  deviceId: string,
  deviceName: string,
  temperature: number | null,
  humidity: number | null,
): void {
  try {
    database
      .insert(sensorReadings)
      .values({
        device_id: deviceId,
        device_name: deviceName,
        temperature,
        humidity,
      })
      .run()
  } catch (error) {
    log.error(`Failed to insert sensor reading for ${deviceId}:`, error)
  }
}

export function getBrightnessHistory(limit = 100): SensorReading[] {
  return database
    .select()
    .from(sensorReadings)
    .orderBy(desc(sensorReadings.timestamp))
    .limit(limit)
    .all()
}

type AggregatedRow = {
  timestamp: string
  device_id: string
  device_name: string
  brightness: number | null
  battery: number | null
}

export function getAggregatedHistory(mode: AggregationMode): AggregatedRow[] {
  const config = AGGREGATION_CONFIG[mode]

  if (mode === "raw") {
    return database
      .select()
      .from(sensorReadings)
      .where(
        sql`timestamp >= datetime('now', ${sql.raw(`'${config.timeRange}'`)})`,
      )
      .orderBy(desc(sensorReadings.timestamp))
      .all()
      .map((row) => ({
        timestamp: row.timestamp,
        device_id: row.device_id,
        device_name: row.device_name,
        brightness: row.brightness != null ? Number(row.brightness) : null,
        battery: row.battery,
      }))
  }

  const rows = sqliteDatabase
    .prepare(
      `SELECT
        strftime('${config.strftimeFormat}', timestamp) as timestamp,
        device_id,
        device_name,
        AVG(CAST(brightness AS REAL)) as brightness,
        AVG(battery) as battery
      FROM sensor_readings
      WHERE timestamp >= datetime('now', '${config.timeRange}')
      GROUP BY strftime('${config.strftimeFormat}', timestamp), device_id
      ORDER BY timestamp ASC`,
    )
    .all() as AggregatedRow[]

  return rows.map((row) => ({
    timestamp: row.timestamp,
    device_id: row.device_id,
    device_name: row.device_name,
    brightness:
      row.brightness != null ? Math.round(row.brightness * 100) / 100 : null,
    battery: row.battery != null ? Math.round(row.battery * 100) / 100 : null,
  }))
}

export function insertWebhookEvent(
  eventType: string,
  eventVersion: string | null,
  deviceType: string | null,
  deviceMac: string | null,
  payload: string,
): void {
  try {
    database
      .insert(webhookEvents)
      .values({
        event_type: eventType,
        event_version: eventVersion,
        device_type: deviceType,
        device_mac: deviceMac,
        payload,
      })
      .run()
  } catch (error) {
    log.error(`Failed to insert webhook event (${eventType}):`, error)
  }
}

type TemperatureRow = {
  timestamp: string
  device_id: string
  device_name: string
  temperature: number | null
  humidity: number | null
}

export function getTemperatureHistory(mode: AggregationMode): TemperatureRow[] {
  const config = AGGREGATION_CONFIG[mode]

  if (mode === "raw") {
    return database
      .select()
      .from(sensorReadings)
      .where(
        sql`timestamp >= datetime('now', ${sql.raw(`'${config.timeRange}'`)}) AND (temperature IS NOT NULL OR humidity IS NOT NULL)`,
      )
      .orderBy(desc(sensorReadings.timestamp))
      .all()
      .map((row) => ({
        timestamp: row.timestamp,
        device_id: row.device_id,
        device_name: row.device_name,
        temperature: row.temperature,
        humidity: row.humidity,
      }))
  }

  const rows = sqliteDatabase
    .prepare(
      `SELECT
        strftime('${config.strftimeFormat}', timestamp) as timestamp,
        device_id,
        device_name,
        AVG(temperature) as temperature,
        AVG(humidity) as humidity
      FROM sensor_readings
      WHERE timestamp >= datetime('now', '${config.timeRange}')
        AND (temperature IS NOT NULL OR humidity IS NOT NULL)
      GROUP BY strftime('${config.strftimeFormat}', timestamp), device_id
      ORDER BY timestamp ASC`,
    )
    .all() as TemperatureRow[]

  return rows.map((row) => ({
    timestamp: row.timestamp,
    device_id: row.device_id,
    device_name: row.device_name,
    temperature:
      row.temperature != null ? Math.round(row.temperature * 100) / 100 : null,
    humidity:
      row.humidity != null ? Math.round(row.humidity * 100) / 100 : null,
  }))
}

export { database }

export function getSwitchState(
  deviceId: string,
): DeviceSwitchState | undefined {
  return database
    .select()
    .from(deviceSwitchStates)
    .where(sql`device_id = ${deviceId}`)
    .get()
}

export function upsertSwitchState(
  deviceId: string,
  deviceName: string,
  power: "on" | "off",
): void {
  database
    .insert(deviceSwitchStates)
    .values({ device_id: deviceId, device_name: deviceName, power })
    .onConflictDoUpdate({
      target: deviceSwitchStates.device_id,
      set: { power, updated_at: sql`(datetime('now'))` },
    })
    .run()
}

export function getWebhookHistory(limit = 100): WebhookEvent[] {
  return database
    .select()
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.timestamp))
    .limit(limit)
    .all()
}

export function getAllSwitchStates(): DeviceSwitchState[] {
  return database.select().from(deviceSwitchStates).all()
}

export function insertSwitchLog(
  deviceId: string,
  deviceName: string,
  action: "on" | "off",
  triggerReason: string | null,
): void {
  database
    .insert(switchLog)
    .values({
      device_id: deviceId,
      device_name: deviceName,
      action,
      trigger_reason: triggerReason,
    })
    .run()
}

export function getSwitchLog(limit = 100): SwitchLogEntry[] {
  return database
    .select()
    .from(switchLog)
    .orderBy(desc(switchLog.timestamp))
    .limit(limit)
    .all()
}

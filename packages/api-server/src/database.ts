import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { desc, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import {
  type BrightnessLog,
  brightnessLogs,
  type WebhookEvent,
  webhookEvents,
} from "./schema"

const databasePath = process.env.DB_PATH || "/data/brightness.db"

mkdirSync(dirname(databasePath), { recursive: true })

const sqliteDatabase = new Database(databasePath, { create: true })
sqliteDatabase.exec("PRAGMA journal_mode=WAL")

const database = drizzle(sqliteDatabase)
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url))

migrate(database, { migrationsFolder })

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
  database
    .insert(brightnessLogs)
    .values({
      device_id: deviceId,
      device_name: deviceName,
      brightness,
      battery,
    })
    .run()
}

export function getBrightnessHistory(limit = 100): BrightnessLog[] {
  return database
    .select()
    .from(brightnessLogs)
    .orderBy(desc(brightnessLogs.timestamp))
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
      .from(brightnessLogs)
      .where(
        sql`timestamp >= datetime('now', ${sql.raw(`'${config.timeRange}'`)})`,
      )
      .orderBy(desc(brightnessLogs.timestamp))
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
      FROM brightness_logs
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
}

export function getWebhookHistory(limit = 100): WebhookEvent[] {
  return database
    .select()
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.timestamp))
    .limit(limit)
    .all()
}

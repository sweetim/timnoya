import { sql } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const sensorReadings = sqliteTable("sensor_readings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: text("timestamp").notNull().default(sql`(datetime('now'))`),
  device_id: text("device_id").notNull(),
  device_name: text("device_name").notNull(),
  brightness: text("brightness"),
  temperature: integer("temperature"),
  humidity: integer("humidity"),
  battery: integer("battery"),
})

export const webhookEvents = sqliteTable("webhook_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: text("timestamp").notNull().default(sql`(datetime('now'))`),
  event_type: text("event_type").notNull(),
  event_version: text("event_version"),
  device_type: text("device_type"),
  device_mac: text("device_mac"),
  payload: text("payload").notNull(),
})

export type SensorReading = typeof sensorReadings.$inferSelect
export type WebhookEvent = typeof webhookEvents.$inferSelect

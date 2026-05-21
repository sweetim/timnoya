import { sql } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const brightnessLogs = sqliteTable("brightness_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: text("timestamp").notNull().default(sql`(datetime('now'))`),
  device_id: text("device_id").notNull(),
  device_name: text("device_name").notNull(),
  brightness: text("brightness").notNull(),
  battery: integer("battery"),
})

export type BrightnessLog = typeof brightnessLogs.$inferSelect

import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { desc } from "drizzle-orm"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { type BrightnessLog, brightnessLogs } from "./schema"

const databasePath = process.env.DB_PATH || "/data/brightness.db"

mkdirSync(dirname(databasePath), { recursive: true })

const sqliteDatabase = new Database(databasePath, { create: true })
sqliteDatabase.exec("PRAGMA journal_mode=WAL")

const database = drizzle(sqliteDatabase)
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url))

migrate(database, { migrationsFolder })

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

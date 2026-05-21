import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"

const dbPath = process.env.DB_PATH || "/data/brightness.db"

mkdirSync(dirname(dbPath), { recursive: true })

const db = new Database(dbPath, { create: true })
db.exec("PRAGMA journal_mode=WAL")

db.exec(`
  CREATE TABLE IF NOT EXISTS brightness_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    brightness TEXT NOT NULL
  )
`)

const insertStmt = db.prepare(
  "INSERT INTO brightness_logs (brightness) VALUES (?)",
)

const selectRecentStmt = db.prepare(
  "SELECT id, timestamp, brightness FROM brightness_logs ORDER BY timestamp DESC LIMIT ?",
)

export function insertBrightness(brightness: string): void {
  insertStmt.run(brightness)
}

export function getBrightnessHistory(
  limit = 100,
): Array<{ id: number; timestamp: string; brightness: string }> {
  return selectRecentStmt.all(limit) as Array<{
    id: number
    timestamp: string
    brightness: string
  }>
}

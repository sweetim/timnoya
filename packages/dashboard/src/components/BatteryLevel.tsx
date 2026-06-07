import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)

import { Battery, Eye, EyeOff } from "lucide-react"
import { useMemo, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { BrightnessReading } from "@/types"

const DEVICE_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
]

function toLocalDateKey(isoTimestamp: string): string {
  return dayjs.utc(isoTimestamp).local().format("YYYY-MM-DD")
}

type BatteryLevelProps = {
  readings: BrightnessReading[]
  loading: boolean
}

export function BatteryLevel({ readings, loading }: BatteryLevelProps) {
  const devices = useMemo(() => {
    const seen = new Map<string, string>()
    for (const reading of readings) {
      if (reading.battery == null) continue
      if (!seen.has(reading.device_id)) {
        seen.set(reading.device_id, reading.device_name)
      }
    }
    return [...seen.entries()]
  }, [readings])

  const [hiddenDevices, setHiddenDevices] = useState<Set<string>>(new Set())

  const toggleDevice = (deviceId: string) => {
    setHiddenDevices((prev) => {
      const next = new Set(prev)
      if (next.has(deviceId)) next.delete(deviceId)
      else next.add(deviceId)
      return next
    })
  }

  const chartData = useMemo(() => {
    const byTimestamp = new Map<string, Record<string, number | string>>()

    for (const reading of readings) {
      if (reading.battery == null) continue
      const key = toLocalDateKey(reading.timestamp)
      const existing = byTimestamp.get(key) ?? { time: key }
      existing[reading.device_id] = reading.battery
      byTimestamp.set(key, existing)
    }

    return [...byTimestamp.values()].sort((a, b) =>
      String(a.time).localeCompare(String(b.time)),
    )
  }, [readings])

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <div className="h-6 w-40 rounded shimmer mb-4" />
        <div className="h-52 rounded shimmer" />
      </div>
    )
  }

  if (chartData.length === 0) return null

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Battery
            className="h-4 w-4 text-green-400"
            strokeWidth={2}
          />
          <span className="text-sm font-medium text-slate-300">
            Battery Level
          </span>
        </div>

        <span className="rounded-lg border border-white/[0.08] px-3 py-1 text-xs font-medium text-slate-400">
          Daily (90d)
        </span>
      </div>

      {devices.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {devices.map(([deviceId, deviceName], idx) => {
            const hidden = hiddenDevices.has(deviceId)
            const color = DEVICE_COLORS[idx % DEVICE_COLORS.length]
            return (
              <button
                key={deviceId}
                type="button"
                onClick={() => toggleDevice(deviceId)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 border ${
                  hidden
                    ? "bg-white/[0.02] text-slate-600 border-white/[0.04]"
                    : "bg-white/[0.05] text-slate-300 border-white/[0.08]"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: hidden ? "transparent" : color }}
                />
                {deviceName}
                {hidden ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </button>
            )
          })}
        </div>
      )}

      <ResponsiveContainer
        width="100%"
        height={220}
      >
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "#64748b" }}
            stroke="rgba(255,255,255,0.1)"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#64748b" }}
            stroke="rgba(255,255,255,0.1)"
            tickFormatter={(value: unknown): string => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(18,18,26,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: unknown, name: unknown): [string, string] => [
              `${value}%`,
              String(name ?? "Battery"),
            ]}
          />
          {devices.map(([deviceId, deviceName], idx) => (
            <Line
              key={deviceId}
              type="monotone"
              dataKey={deviceId}
              name={deviceName}
              stroke={DEVICE_COLORS[idx % DEVICE_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
              hide={hiddenDevices.has(deviceId)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

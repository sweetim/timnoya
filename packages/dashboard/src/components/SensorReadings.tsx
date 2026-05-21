import { Battery, Eye, EyeOff, Sun } from "lucide-react"
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

function brightnessToNumber(value: string): number | null {
  const num = Number(value)
  if (!Number.isNaN(num)) return num
  const map: Record<string, number> = {
    bright: 100,
    clear: 80,
    dim: 50,
    dark: 20,
  }
  return map[value.toLowerCase()] ?? null
}

type SensorReadingsProps = {
  readings: BrightnessReading[]
  loading: boolean
}

export function SensorReadings({ readings, loading }: SensorReadingsProps) {
  const devices = useMemo(() => {
    const seen = new Map<string, string>()
    for (const r of readings) {
      if (!seen.has(r.device_id)) seen.set(r.device_id, r.device_name)
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

    for (const r of readings) {
      const key = r.timestamp.slice(0, 16)
      const existing = byTimestamp.get(key) ?? { time: key }
      const numVal = brightnessToNumber(r.brightness)
      if (numVal !== null) {
        existing[r.device_id] = numVal
      }
      byTimestamp.set(key, existing)
    }

    return [...byTimestamp.values()].sort((a, b) =>
      String(a.time).localeCompare(String(b.time)),
    )
  }, [readings])

  const batteryChartData = useMemo(() => {
    const byTimestamp = new Map<string, Record<string, number | string>>()

    for (const r of readings) {
      if (r.battery == null) continue
      const key = r.timestamp.slice(0, 16)
      const existing = byTimestamp.get(key) ?? { time: key }
      existing[`${r.device_id}_battery`] = r.battery
      byTimestamp.set(key, existing)
    }

    return [...byTimestamp.values()].sort((a, b) =>
      String(a.time).localeCompare(String(b.time)),
    )
  }, [readings])

  const hasBatteryData = batteryChartData.length > 0

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <div className="h-6 w-40 rounded shimmer mb-4" />
        <div className="h-64 rounded shimmer" />
      </div>
    )
  }

  if (readings.length === 0) return null

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sun
          className="h-4 w-4 text-yellow-400"
          strokeWidth={2}
        />
        <span className="text-sm font-medium text-slate-300">
          Sensor Readings
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
        height={280}
      >
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
          />
          <XAxis
            dataKey="time"
            tickFormatter={(t: unknown): string => {
              const s = String(t ?? "")
              const parts = s.split(" ")
              return parts.length >= 2 ? (parts[1] as string) : s
            }}
            tick={{ fontSize: 10, fill: "#64748b" }}
            stroke="rgba(255,255,255,0.1)"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#64748b" }}
            stroke="rgba(255,255,255,0.1)"
          />
          <Tooltip
            contentStyle={{
              background: "rgba(18,18,26,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelFormatter={(label: unknown) => {
              const s = String(label ?? "")
              const parts = s.split(" ")
              return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : s
            }}
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

      {hasBatteryData && (
        <>
          <div className="flex items-center gap-2 mt-6 mb-4">
            <Battery
              className="h-4 w-4 text-green-400"
              strokeWidth={2}
            />
            <span className="text-sm font-medium text-slate-300">
              Battery Level
            </span>
          </div>

          <ResponsiveContainer
            width="100%"
            height={200}
          >
            <LineChart data={batteryChartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="time"
                tickFormatter={(t: unknown): string => {
                  const s = String(t ?? "")
                  const parts = s.split(" ")
                  return parts.length >= 2 ? (parts[1] as string) : s
                }}
                tick={{ fontSize: 10, fill: "#64748b" }}
                stroke="rgba(255,255,255,0.1)"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#64748b" }}
                stroke="rgba(255,255,255,0.1)"
                tickFormatter={(v: unknown): string => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(18,18,26,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(label: unknown) => {
                  const s = String(label ?? "")
                  const parts = s.split(" ")
                  return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : s
                }}
                formatter={(
                  value: unknown,
                  name: unknown,
                ): [string, string] => {
                  const deviceName = String(name ?? "").replace(/_battery$/, "")
                  return [`${value}%`, deviceName]
                }}
              />
              {devices.map(([deviceId, deviceName], idx) => (
                <Line
                  key={deviceId}
                  type="monotone"
                  dataKey={`${deviceId}_battery`}
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
        </>
      )}
    </div>
  )
}

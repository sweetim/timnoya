import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)

import { Eye, EyeOff, Zap } from "lucide-react"
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
import type { AggregationMode, PowerReading } from "@/types"

const DEVICE_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
]

const AGGREGATION_LABELS: Record<AggregationMode, string> = {
  raw: "Raw (24h)",
  hourly: "Hourly (7d)",
  daily: "Daily (90d)",
}

function toLocalTimeKey(isoTimestamp: string): string {
  return dayjs.utc(isoTimestamp).local().format("YYYY-MM-DD HH:mm")
}

type PowerUsageProps = {
  readings: PowerReading[]
  loading: boolean
  aggregation: AggregationMode
  onAggregationChange: (mode: AggregationMode) => void
}

export function PowerUsage({
  readings,
  loading,
  aggregation,
  onAggregationChange,
}: PowerUsageProps) {
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
      if (r.power_watts == null) continue
      const key = toLocalTimeKey(r.timestamp)
      const existing = byTimestamp.get(key) ?? { time: key }
      existing[r.device_id] = r.power_watts
      byTimestamp.set(key, existing)
    }

    return [...byTimestamp.values()].sort((a, b) =>
      String(a.time).localeCompare(String(b.time)),
    )
  }, [readings])

  const formatXAxisTick = (t: unknown): string => {
    const s = String(t ?? "")
    if (aggregation === "daily") {
      const parts = s.split(" ")
      return parts[0] ?? s
    }
    const parts = s.split(" ")
    return parts.length >= 2 ? (parts[1] as string) : s
  }

  const formatTooltipLabel = (label: unknown): string => {
    const s = String(label ?? "")
    if (aggregation === "daily") {
      const parts = s.split(" ")
      return parts[0] ?? s
    }
    const parts = s.split(" ")
    return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : s
  }

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap
            className="h-4 w-4 text-yellow-400"
            strokeWidth={2}
          />
          <span className="text-sm font-medium text-slate-300">
            Power Usage
          </span>
        </div>

        <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
          {(
            Object.entries(AGGREGATION_LABELS) as [AggregationMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onAggregationChange(mode)}
              className={`px-3 py-1 text-xs font-medium transition-all duration-200 ${
                aggregation === mode
                  ? "bg-white/[0.1] text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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
            tickFormatter={formatXAxisTick}
            tick={{ fontSize: 10, fill: "#64748b" }}
            stroke="rgba(255,255,255,0.1)"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#64748b" }}
            stroke="rgba(255,255,255,0.1)"
            tickFormatter={(v: unknown): string => `${v} W`}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(18,18,26,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelFormatter={formatTooltipLabel}
            formatter={(value: unknown, name: unknown): [string, string] => [
              `${value} W`,
              String(name ?? "Power"),
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

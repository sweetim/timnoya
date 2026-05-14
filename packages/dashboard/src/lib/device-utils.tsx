import type { LucideIcon } from "lucide-react"
import { Blinds, Bot, Plug, Radio, Router, Thermometer } from "lucide-react"
import type React from "react"
import { match, P } from "ts-pattern"

const deviceTypePattern = (substring: string) =>
  P.when((s): s is string => typeof s === "string" && s.includes(substring))

export function deviceIcon(type: string): LucideIcon {
  return match(type.toLowerCase())
    .with(deviceTypePattern("curtain"), () => Blinds)
    .with(deviceTypePattern("meter"), () => Thermometer)
    .with(deviceTypePattern("bot"), () => Bot)
    .with(deviceTypePattern("plug"), () => Plug)
    .with(deviceTypePattern("hub"), () => Router)
    .otherwise(() => Radio)
}

export function deviceIconColor(type: string): string {
  return match(type.toLowerCase())
    .with(deviceTypePattern("curtain"), () => "text-blue-400")
    .with(deviceTypePattern("meter"), () => "text-amber-400")
    .with(deviceTypePattern("bot"), () => "text-purple-400")
    .with(deviceTypePattern("plug"), () => "text-emerald-400")
    .with(deviceTypePattern("hub"), () => "text-cyan-400")
    .otherwise(() => "text-slate-400")
}

export function deviceIconBg(type: string): string {
  return match(type.toLowerCase())
    .with(deviceTypePattern("curtain"), () => "bg-blue-500/10")
    .with(deviceTypePattern("meter"), () => "bg-amber-500/10")
    .with(deviceTypePattern("bot"), () => "bg-purple-500/10")
    .with(deviceTypePattern("plug"), () => "bg-emerald-500/10")
    .with(deviceTypePattern("hub"), () => "bg-cyan-500/10")
    .otherwise(() => "bg-slate-500/10")
}

function BatteryIndicator({ value }: { value: number }) {
  const color = match(value)
    .with(
      P.when((v) => v > 60),
      () => "bg-emerald-500",
    )
    .with(
      P.when((v) => v > 20),
      () => "bg-amber-500",
    )
    .otherwise(() => "bg-red-500")

  const glow = match(value)
    .with(
      P.when((v) => v > 60),
      () => "shadow-[0_0_6px_rgba(34,197,94,0.4)]",
    )
    .with(
      P.when((v) => v > 20),
      () => "",
    )
    .otherwise(() => "shadow-[0_0_6px_rgba(239,68,68,0.4)]")

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bar-bg">
        <div
          className={`h-full rounded-full ${color} ${glow} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-400">{value}%</span>
    </div>
  )
}

function PositionIndicator({ value }: { value: string | number }) {
  const num = typeof value === "string" ? Number(value) : value
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bar-bg">
        <div
          className="h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.4)] transition-all duration-500"
          style={{ width: `${num}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-400">{num}%</span>
    </div>
  )
}

function BooleanBadge({ value }: { value: boolean }) {
  const style = match(value)
    .with(
      true,
      () => "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    )
    .otherwise(
      () => "bg-slate-700/50 text-slate-400 border border-slate-600/30",
    )

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {value ? "Yes" : "No"}
    </span>
  )
}

export function formatValue(key: string, value: unknown): React.ReactNode {
  return match({ key, value })
    .with({ value: P.when((v) => typeof v === "boolean") }, ({ value: v }) => (
      <BooleanBadge value={v as boolean} />
    ))
    .with(
      { key: "battery", value: P.when((v) => typeof v === "number") },
      ({ value: v }) => <BatteryIndicator value={v as number} />,
    )
    .with({ key: "slidePosition" }, ({ value: v }) => (
      <PositionIndicator value={v as string | number} />
    ))
    .otherwise(({ value: v }) => (
      <span className="text-sm text-slate-300">{String(v)}</span>
    ))
}

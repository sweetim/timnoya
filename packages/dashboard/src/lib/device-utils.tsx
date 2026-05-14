import type { LucideIcon } from "lucide-react";
import { Blinds, Thermometer, Bot, Plug, Router, Radio } from "lucide-react";
import React from "react";

export function deviceIcon(type: string): LucideIcon {
  const lower = type.toLowerCase();
  if (lower.includes("curtain")) return Blinds;
  if (lower.includes("meter")) return Thermometer;
  if (lower.includes("bot")) return Bot;
  if (lower.includes("plug")) return Plug;
  if (lower.includes("hub")) return Router;
  return Radio;
}

export function deviceIconColor(type: string): string {
  const lower = type.toLowerCase();
  if (lower.includes("curtain")) return "text-blue-400";
  if (lower.includes("meter")) return "text-amber-400";
  if (lower.includes("bot")) return "text-purple-400";
  if (lower.includes("plug")) return "text-emerald-400";
  if (lower.includes("hub")) return "text-cyan-400";
  return "text-slate-400";
}

export function deviceIconBg(type: string): string {
  const lower = type.toLowerCase();
  if (lower.includes("curtain")) return "bg-blue-500/10";
  if (lower.includes("meter")) return "bg-amber-500/10";
  if (lower.includes("bot")) return "bg-purple-500/10";
  if (lower.includes("plug")) return "bg-emerald-500/10";
  if (lower.includes("hub")) return "bg-cyan-500/10";
  return "bg-slate-500/10";
}

function BatteryIndicator({ value }: { value: number }) {
  const color =
    value > 60 ? "bg-emerald-500" : value > 20 ? "bg-amber-500" : "bg-red-500";
  const glow =
    value > 60 ? "shadow-[0_0_6px_rgba(34,197,94,0.4)]" : value > 20 ? "" : "shadow-[0_0_6px_rgba(239,68,68,0.4)]";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bar-bg">
        <div className={`h-full rounded-full ${color} ${glow} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-400">{value}%</span>
    </div>
  );
}

function PositionIndicator({ value }: { value: string | number }) {
  const num = typeof value === "string" ? Number(value) : value;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bar-bg">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.4)] transition-all duration-500"
          style={{ width: `${num}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-400">{num}%</span>
    </div>
  );
}

function BooleanBadge({ value }: { value: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        value
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
          : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
      }`}
    >
      {value ? "Yes" : "No"}
    </span>
  );
}

export function formatValue(key: string, value: unknown): React.ReactNode {
  if (typeof value === "boolean") return <BooleanBadge value={value} />;
  if (key === "battery" && typeof value === "number") return <BatteryIndicator value={value} />;
  if (key === "slidePosition") return <PositionIndicator value={value as string | number} />;
  return <span className="text-sm text-slate-300">{String(value)}</span>;
}

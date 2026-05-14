import { AlertCircle } from "lucide-react"
import {
  deviceIcon,
  deviceIconBg,
  deviceIconColor,
  formatValue,
} from "@/lib/device-utils"
import type { DeviceStatus } from "@/types"
import { KNOWN_FIELDS } from "@/types"

export function DeviceCard({ device }: { device: DeviceStatus }) {
  const Icon = deviceIcon(device.type)
  const iconColor = deviceIconColor(device.type)
  const iconBg = deviceIconBg(device.type)
  const extraEntries = Object.entries(device).filter(
    ([k]) => !KNOWN_FIELDS.has(k) && device[k] !== undefined,
  )

  return (
    <div className="glass-card rounded-2xl p-5 transition-all duration-300 group">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}
          >
            <Icon
              className={`h-5 w-5 ${iconColor}`}
              strokeWidth={1.8}
            />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 leading-tight">
              {device.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{device.type}</p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${device.kind === "physical" ? "badge-physical" : "badge-infrared"}`}
        >
          {device.kind}
        </span>
      </div>

      {device.error ? (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 border border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <p className="text-sm text-red-400">Failed to fetch status</p>
        </div>
      ) : extraEntries.length === 0 ? (
        <p className="text-sm text-slate-600 py-2">No status data available</p>
      ) : (
        <dl className="space-y-2.5">
          {extraEntries.map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4"
            >
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {key}
              </dt>
              <dd>{formatValue(key, value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

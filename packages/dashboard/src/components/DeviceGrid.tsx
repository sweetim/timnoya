import { Radio, WifiOff } from "lucide-react"
import type { DeviceStatus } from "@/types"
import { KNOWN_FIELDS } from "@/types"
import {
  deviceIcon,
  deviceIconBg,
  deviceIconColor,
  compactStatusIcons,
  formatValue,
} from "@/lib/device-utils"
import { DeviceCard } from "./DeviceCard"
import { DeviceTable } from "./DeviceTable"
import { SkeletonCard } from "./SkeletonCard"
import { SkeletonTable } from "./SkeletonTable"
import type { ViewMode } from "./ViewToggle"
import { ViewToggle } from "./ViewToggle"

type DeviceGridProps = {
  devices: DeviceStatus[]
  loading: boolean
  error: string | null
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function DeviceGrid({
  devices,
  loading,
  error,
  viewMode,
  onViewModeChange,
}: DeviceGridProps) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4">
          <WifiOff className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Connection Error</p>
            <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {!error && !loading && devices.length > 0 && (
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 glow-green" />
            <span className="text-xs text-slate-500">
              {devices.length} devices connected
            </span>
          </div>
          <ViewToggle
            value={viewMode}
            onChange={onViewModeChange}
          />
        </div>
      )}

      {loading ? (
        viewMode === "table" ? (
          <SkeletonTable />
        ) : viewMode === "compact" ? (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {Array.from({ length: 8 }, (_, i) => `skeleton-${i}`).map((key) => (
              <div
                key={key}
                className="glass-card aspect-square rounded-xl shimmer"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => `skeleton-${i}`).map((key) => (
              <SkeletonCard key={key} />
            ))}
          </div>
        )
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-600">
          <Radio className="h-12 w-12 mb-4 text-slate-700" />
          <p className="text-lg font-medium text-slate-500">No devices found</p>
          <p className="text-sm text-slate-600 mt-1">
            Check your SwitchBot hub connection
          </p>
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <DeviceCard
              key={device.name}
              device={device}
            />
          ))}
        </div>
      ) : viewMode === "table" ? (
        <DeviceTable devices={devices} />
      ) : (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
          {devices.map((device) => {
            const Icon = deviceIcon(device.type)
            const iconColor = deviceIconColor(device.type)
            const iconBg = deviceIconBg(device.type)
            const statusIcons = compactStatusIcons(device, KNOWN_FIELDS)
            const extraEntries = Object.entries(device).filter(
              ([k]) => !KNOWN_FIELDS.has(k) && device[k] !== undefined,
            )
            return (
              <div
                key={device.name}
                className="glass-card compact-card aspect-square rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300 group relative"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon
                    className={`h-6 w-6 ${iconColor}`}
                    strokeWidth={1.8}
                  />
                </div>
                {device.error ? (
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 glow-red" />
                ) : (
                  statusIcons
                )}
                <div className="compact-tooltip">
                  <p className="font-semibold text-slate-100 text-sm">
                    {device.name}
                  </p>
                  <p className="text-xs text-slate-500 mb-2">{device.type}</p>
                  {device.error ? (
                    <p className="text-xs text-red-400">
                      Failed to fetch status
                    </p>
                  ) : extraEntries.length === 0 ? (
                    <p className="text-xs text-slate-600">No status data</p>
                  ) : (
                    <dl className="space-y-1">
                      {extraEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-4"
                        >
                          <dt className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                            {key}
                          </dt>
                          <dd className="text-xs">{formatValue(key, value)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}

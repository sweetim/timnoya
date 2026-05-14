import { Radio, WifiOff } from "lucide-react"
import type { DeviceStatus } from "@/types"
import { DeviceCard } from "./DeviceCard"
import { SkeletonCard } from "./SkeletonCard"

type DeviceGridProps = {
  devices: DeviceStatus[]
  loading: boolean
  error: string | null
}

export function DeviceGrid({ devices, loading, error }: DeviceGridProps) {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
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
        <div className="mb-6 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 glow-green" />
          <span className="text-xs text-slate-500">
            {devices.length} devices connected
          </span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => `skeleton-${i}`).map((key) => (
            <SkeletonCard key={key} />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-600">
          <Radio className="h-12 w-12 mb-4 text-slate-700" />
          <p className="text-lg font-medium text-slate-500">No devices found</p>
          <p className="text-sm text-slate-600 mt-1">
            Check your SwitchBot hub connection
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <DeviceCard
              key={device.name}
              device={device}
            />
          ))}
        </div>
      )}
    </main>
  )
}

import { Battery, Cpu } from "lucide-react"
import {
  BatteryIndicator,
  deviceIcon,
  deviceIconBg,
  deviceIconColor,
} from "@/lib/device-utils"
import type { DeviceStatus } from "@/types"

type SummaryCardProps = {
  devices: DeviceStatus[]
}

export function SummaryCard({ devices }: SummaryCardProps) {
  const batteryDevices = devices.filter(
    (d) => !d.error && typeof d.battery === "number",
  )

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
          <Cpu
            className="h-5 w-5 text-cyan-400"
            strokeWidth={1.8}
          />
        </div>
        <div>
          <h2 className="font-semibold text-slate-100">Summary</h2>
          <p className="text-xs text-slate-500">
            {devices.length} total device{devices.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {batteryDevices.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Battery
              className="h-3.5 w-3.5 text-slate-500"
              strokeWidth={2}
            />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Battery Status
            </span>
          </div>
          {batteryDevices.map((device) => {
            const Icon = deviceIcon(device.type)
            const iconColor = deviceIconColor(device.type)
            const iconBg = deviceIconBg(device.type)
            return (
              <div
                key={device.name}
                className="flex items-center gap-3 rounded-xl bg-white/[0.02] px-3 py-2.5 border border-white/[0.04]"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
                >
                  <Icon
                    className={`h-4 w-4 ${iconColor}`}
                    strokeWidth={1.8}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {device.name}
                  </p>
                </div>
                <BatteryIndicator value={device.battery as number} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { AlertCircle } from "lucide-react"
import {
  deviceIcon,
  deviceIconBg,
  deviceIconColor,
  formatValue,
} from "@/lib/device-utils"
import type { DeviceStatus } from "@/types"
import { KNOWN_FIELDS } from "@/types"

function collectExtraKeys(devices: DeviceStatus[]): string[] {
  const keys = new Set<string>()
  for (const device of devices) {
    for (const key of Object.keys(device)) {
      if (!KNOWN_FIELDS.has(key) && device[key] !== undefined) {
        keys.add(key)
      }
    }
  }
  return [...keys]
}

export function DeviceTable({ devices }: { devices: DeviceStatus[] }) {
  const extraKeys = collectExtraKeys(devices)

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="sticky-device-col px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Device</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Kind</th>
              {extraKeys.map((key) => (
                <th key={key} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => {
              const Icon = deviceIcon(device.type)
              const iconColor = deviceIconColor(device.type)
              const iconBg = deviceIconBg(device.type)

              return (
                <tr
                  key={device.name}
                  className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="sticky-device-col px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
                        <Icon className={`h-4 w-4 ${iconColor}`} strokeWidth={1.8} />
                      </div>
                      <span className="font-medium text-slate-100 text-sm whitespace-nowrap">{device.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-400">{device.type}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${device.kind === "physical" ? "badge-physical" : "badge-infrared"}`}>
                      {device.kind}
                    </span>
                  </td>
                  {extraKeys.map((key) => (
                    <td key={key} className="px-5 py-3.5">
                      {device.error ? (
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-xs text-red-400">Error</span>
                        </div>
                      ) : device[key] !== undefined ? (
                        formatValue(key, device[key])
                      ) : (
                        <span className="text-xs text-slate-700">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

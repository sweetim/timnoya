import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)

import { Power, ToggleLeft } from "lucide-react"
import type { SwitchLogEntry, SwitchState } from "@/types"

type SwitchStatusProps = {
  switches: SwitchState[]
  switchLog: SwitchLogEntry[]
  loading: boolean
  logLoading: boolean
}

function SwitchCard({ switchState }: { switchState: SwitchState }) {
  const isOn = switchState.power === "on"
  return (
    <div className="glass-card rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            isOn ? "bg-emerald-500/10" : "bg-slate-500/10"
          }`}
        >
          <Power
            className={`h-5 w-5 ${isOn ? "text-emerald-400" : "text-slate-500"}`}
            strokeWidth={2}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-200">
            {switchState.device_name}
          </p>
          <p className="text-[10px] text-slate-600 font-mono">
            {switchState.device_id}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-slate-600">
          {dayjs.utc(switchState.updated_at).local().format("MMM D, HH:mm")}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isOn
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
          }`}
        >
          {isOn ? "ON" : "OFF"}
        </span>
      </div>
    </div>
  )
}

export function SwitchStatus({
  switches,
  switchLog,
  loading,
  logLoading,
}: SwitchStatusProps) {
  if (loading && logLoading) {
    return (
      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-5">
          <div className="h-6 w-40 rounded shimmer mb-4" />
          <div className="space-y-3">
            {["a", "b"].map((k) => (
              <div
                key={k}
                className="h-16 rounded shimmer"
              />
            ))}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="h-6 w-40 rounded shimmer mb-4" />
          <div className="space-y-3">
            {["a", "b", "c", "d", "e"].map((k) => (
              <div
                key={k}
                className="h-10 rounded shimmer"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Power
            className="h-4 w-4 text-emerald-400"
            strokeWidth={2}
          />
          <span className="text-sm font-medium text-slate-300">
            Switch States
          </span>
          <span className="text-xs text-slate-600">({switches.length})</span>
        </div>

        {switches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-600">
            <ToggleLeft className="h-10 w-10 mb-3 text-slate-700" />
            <p className="text-sm text-slate-500">No switches configured</p>
          </div>
        ) : (
          <div className="space-y-2">
            {switches.map((s) => (
              <SwitchCard
                key={s.device_id}
                switchState={s}
              />
            ))}
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ToggleLeft
            className="h-4 w-4 text-cyan-400"
            strokeWidth={2}
          />
          <span className="text-sm font-medium text-slate-300">Switch Log</span>
          <span className="text-xs text-slate-600">({switchLog.length})</span>
        </div>

        {logLoading ? (
          <div className="space-y-3">
            {["a", "b", "c", "d", "e"].map((k) => (
              <div
                key={k}
                className="h-10 rounded shimmer"
              />
            ))}
          </div>
        ) : switchLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-600">
            <ToggleLeft className="h-10 w-10 mb-3 text-slate-700" />
            <p className="text-sm text-slate-500">
              No switch toggle events yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {switchLog.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {dayjs
                        .utc(entry.timestamp)
                        .local()
                        .format("MMM D, HH:mm:ss")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-300">
                          {entry.device_name}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {entry.device_id}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          entry.action === "on"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {entry.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {entry.trigger_reason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

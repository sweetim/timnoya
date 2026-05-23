import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)

import { ChevronLeft, ChevronRight, Webhook } from "lucide-react"
import { useMemo, useState } from "react"
import type { WebhookEvent } from "@/types"

const PAGE_SIZE = 20

type WebhookEventsProps = {
  events: WebhookEvent[]
  loading: boolean
}

function PayloadPreview({ payload }: { payload: string }) {
  const [expanded, setExpanded] = useState(false)

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(payload)
  } catch {
    parsed = { raw: payload }
  }

  return (
    <div className="max-w-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-left text-xs text-slate-400 hover:text-slate-200 transition-colors font-mono"
      >
        {expanded ? "Collapse" : "Expand"}
      </button>
      {expanded && (
        <pre className="mt-1 rounded-lg bg-dark-900 p-2 text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )}
      {!expanded && (
        <p className="mt-1 text-[10px] text-slate-600 truncate font-mono">
          {JSON.stringify(parsed).slice(0, 80)}
          {JSON.stringify(parsed).length > 80 ? "..." : ""}
        </p>
      )}
    </div>
  )
}

export function WebhookEvents({ events, loading }: WebhookEventsProps) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const pageEvents = useMemo(
    () => events.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [events, safePage],
  )

  if (loading) {
    return (
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
    )
  }

  if (events.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Webhook
            className="h-4 w-4 text-cyan-400"
            strokeWidth={2}
          />
          <span className="text-sm font-medium text-slate-300">
            Webhook Events
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-slate-600">
          <Webhook className="h-10 w-10 mb-3 text-slate-700" />
          <p className="text-sm text-slate-500">No webhook events yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Webhook
            className="h-4 w-4 text-cyan-400"
            strokeWidth={2}
          />
          <span className="text-sm font-medium text-slate-300">
            Webhook Events
          </span>
          <span className="text-xs text-slate-600">({events.length})</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Event
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Device
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Payload
              </th>
            </tr>
          </thead>
          <tbody>
            {pageEvents.map((event) => (
              <tr
                key={event.id}
                className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                  {dayjs.utc(event.timestamp).local().format("MMM D, HH:mm")}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 text-xs font-medium">
                    {event.event_type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {event.device_type ? (
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-300">
                        {event.device_type}
                      </span>
                      {event.device_mac && (
                        <span className="text-[10px] text-slate-600 font-mono">
                          {event.device_mac}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-700">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <PayloadPreview payload={event.payload} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
          <span className="text-xs text-slate-600">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/5"
            >
              <ChevronLeft className="h-3 w-3" />
              Prev
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/5"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

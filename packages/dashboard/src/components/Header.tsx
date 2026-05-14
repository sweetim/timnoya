import { Home, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

type HeaderProps = {
  lastRefresh: Date | null
  refreshing: boolean
  onRefresh: () => void
}

export function Header({ lastRefresh, refreshing, onRefresh }: HeaderProps) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="glass-header sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-purple-600">
            <Home
              className="h-4.5 w-4.5 text-white"
              strokeWidth={2}
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              timnoya
            </h1>
            <p className="text-xs text-slate-500">Smart Home Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {lastRefresh && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-slate-400">
                {formatRelativeTime(lastRefresh)}
              </span>
              <span className="text-[10px] text-slate-600">
                {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/10 disabled:opacity-50 sm:px-4"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  )
}

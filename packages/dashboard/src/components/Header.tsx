import { Home, RefreshCw } from "lucide-react"

type HeaderProps = {
  lastRefresh: Date | null
  refreshing: boolean
  onRefresh: () => void
}

export function Header({ lastRefresh, refreshing, onRefresh }: HeaderProps) {
  return (
    <header className="glass-header sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
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
            <span className="text-xs text-slate-500 hidden sm:inline">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/10 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>
    </header>
  )
}

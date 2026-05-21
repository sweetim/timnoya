import { useCallback, useEffect, useState } from "react"
import { DeviceGrid } from "@/components/DeviceGrid"
import { Header } from "@/components/Header"
import { SensorReadings } from "@/components/SensorReadings"
import type { ViewMode } from "@/components/ViewToggle"
import type {
  BrightnessHistoryResponse,
  BrightnessReading,
  DeviceStatus,
  StatusResponse,
} from "@/types"
import "./index.css"

const STORAGE_KEY = "timnoya-view-mode"

function loadViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "card" || stored === "table" || stored === "compact")
      return stored
  } catch {}
  return "card"
}

export function App() {
  const [devices, setDevices] = useState<DeviceStatus[]>([])
  const [readings, setReadings] = useState<BrightnessReading[]>([])
  const [loading, setLoading] = useState(true)
  const [readingsLoading, setReadingsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode)

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/devices/status")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: StatusResponse = await res.json()
      setDevices(data.statuses)
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const fetchReadings = useCallback(async () => {
    try {
      const res = await fetch("/api/presence-sensor/brightness?limit=144")
      if (!res.ok) return
      const data: BrightnessHistoryResponse = await res.json()
      setReadings(data.history)
    } catch {
    } finally {
      setReadingsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatuses()
    fetchReadings()
    const interval = setInterval(fetchStatuses, 30_000)
    const readingsInterval = setInterval(fetchReadings, 5 * 60_000)
    return () => {
      clearInterval(interval)
      clearInterval(readingsInterval)
    }
  }, [fetchStatuses, fetchReadings])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchStatuses()
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {}
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <Header
        lastRefresh={lastRefresh}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <SensorReadings
          readings={readings}
          loading={readingsLoading}
        />
      </div>
      <DeviceGrid
        devices={devices}
        loading={loading}
        error={error}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
    </div>
  )
}

export default App

import { useCallback, useEffect, useState } from "react"
import { DeviceGrid } from "@/components/DeviceGrid"
import { Header } from "@/components/Header"
import { SensorReadings } from "@/components/SensorReadings"
import { SwitchStatus } from "@/components/SwitchStatus"
import { TemperatureHumidity } from "@/components/TemperatureHumidity"
import type { ViewMode } from "@/components/ViewToggle"
import { WebhookEvents } from "@/components/WebhookEvents"
import type {
  AggregationMode,
  BrightnessHistoryResponse,
  BrightnessReading,
  DeviceStatus,
  StatusResponse,
  SwitchesResponse,
  SwitchLogEntry,
  SwitchLogResponse,
  SwitchState,
  TemperatureHistoryResponse,
  TemperatureReading,
  WebhookEvent,
  WebhookEventsResponse,
} from "@/types"
import "./index.css"

const STORAGE_KEY = "timnoya-view-mode"
const AGGREGATION_STORAGE_KEY = "timnoya-aggregation"
const TEMP_AGGREGATION_STORAGE_KEY = "timnoya-temp-aggregation"
const TAB_STORAGE_KEY = "timnoya-tab"

type Tab = "dashboard" | "webhooks" | "switches"

function loadViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "card" || stored === "table" || stored === "compact")
      return stored
  } catch {}
  return "card"
}

function loadAggregation(): AggregationMode {
  try {
    const stored = localStorage.getItem(AGGREGATION_STORAGE_KEY)
    if (stored === "raw" || stored === "hourly" || stored === "daily")
      return stored
  } catch {}
  return "hourly"
}

function loadTemperatureAggregation(): AggregationMode {
  try {
    const stored = localStorage.getItem(TEMP_AGGREGATION_STORAGE_KEY)
    if (stored === "raw" || stored === "hourly" || stored === "daily")
      return stored
  } catch {}
  return "hourly"
}

function loadTab(): Tab {
  try {
    const stored = localStorage.getItem(TAB_STORAGE_KEY)
    if (
      stored === "dashboard"
      || stored === "webhooks"
      || stored === "switches"
    )
      return stored
  } catch {}
  return "dashboard"
}

export function App() {
  const [devices, setDevices] = useState<DeviceStatus[]>([])
  const [readings, setReadings] = useState<BrightnessReading[]>([])
  const [temperatureReadings, setTemperatureReadings] = useState<
    TemperatureReading[]
  >([])
  const [loading, setLoading] = useState(true)
  const [readingsLoading, setReadingsLoading] = useState(true)
  const [temperatureReadingsLoading, setTemperatureReadingsLoading] =
    useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode)
  const [aggregation, setAggregation] =
    useState<AggregationMode>(loadAggregation)
  const [temperatureAggregation, setTemperatureAggregation] =
    useState<AggregationMode>(loadTemperatureAggregation)
  const [tab, setTab] = useState<Tab>(loadTab)
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([])
  const [webhooksLoading, setWebhooksLoading] = useState(true)
  const [switchStates, setSwitchStates] = useState<SwitchState[]>([])
  const [switchesLoading, setSwitchesLoading] = useState(true)
  const [switchLog, setSwitchLog] = useState<SwitchLogEntry[]>([])
  const [switchLogLoading, setSwitchLogLoading] = useState(true)

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

  const fetchReadings = useCallback(
    async (mode: AggregationMode = aggregation) => {
      try {
        setReadingsLoading(true)
        const res = await fetch(`/api/sensors/brightness?aggregation=${mode}`)
        if (!res.ok) return
        const data: BrightnessHistoryResponse = await res.json()
        setReadings(data.history)
      } catch {
      } finally {
        setReadingsLoading(false)
      }
    },
    [aggregation],
  )

  const fetchTemperatureReadings = useCallback(
    async (mode: AggregationMode = temperatureAggregation) => {
      try {
        setTemperatureReadingsLoading(true)
        const res = await fetch(`/api/sensors/temperature?aggregation=${mode}`)
        if (!res.ok) return
        const data: TemperatureHistoryResponse = await res.json()
        setTemperatureReadings(data.history)
      } catch {
      } finally {
        setTemperatureReadingsLoading(false)
      }
    },
    [temperatureAggregation],
  )

  const fetchWebhookEvents = useCallback(async () => {
    try {
      setWebhooksLoading(true)
      const res = await fetch("/api/webhook/events?limit=500")
      if (!res.ok) return
      const data: WebhookEventsResponse = await res.json()
      setWebhookEvents(data.events)
    } catch {
    } finally {
      setWebhooksLoading(false)
    }
  }, [])

  const fetchSwitches = useCallback(async () => {
    try {
      setSwitchesLoading(true)
      const res = await fetch("/api/switches")
      if (!res.ok) return
      const data: SwitchesResponse = await res.json()
      setSwitchStates(data.switches)
    } catch {
    } finally {
      setSwitchesLoading(false)
    }
  }, [])

  const fetchSwitchLog = useCallback(async () => {
    try {
      setSwitchLogLoading(true)
      const res = await fetch("/api/switches/log?limit=500")
      if (!res.ok) return
      const data: SwitchLogResponse = await res.json()
      setSwitchLog(data.log)
    } catch {
    } finally {
      setSwitchLogLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatuses()
    fetchReadings()
    fetchTemperatureReadings()
    fetchWebhookEvents()
    fetchSwitches()
    fetchSwitchLog()
    const interval = setInterval(fetchStatuses, 30_000)
    const readingsInterval = setInterval(() => fetchReadings(), 5 * 60_000)
    const temperatureReadingsInterval = setInterval(
      () => fetchTemperatureReadings(),
      5 * 60_000,
    )
    const webhookInterval = setInterval(() => fetchWebhookEvents(), 5 * 60_000)
    const switchInterval = setInterval(() => {
      fetchSwitches()
      fetchSwitchLog()
    }, 5 * 60_000)
    return () => {
      clearInterval(interval)
      clearInterval(readingsInterval)
      clearInterval(temperatureReadingsInterval)
      clearInterval(webhookInterval)
      clearInterval(switchInterval)
    }
  }, [
    fetchStatuses,
    fetchReadings,
    fetchTemperatureReadings,
    fetchWebhookEvents,
    fetchSwitches,
    fetchSwitchLog,
  ])

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

  const handleAggregationChange = (mode: AggregationMode) => {
    setAggregation(mode)
    try {
      localStorage.setItem(AGGREGATION_STORAGE_KEY, mode)
    } catch {}
    fetchReadings(mode)
  }

  const handleTemperatureAggregationChange = (mode: AggregationMode) => {
    setTemperatureAggregation(mode)
    try {
      localStorage.setItem(TEMP_AGGREGATION_STORAGE_KEY, mode)
    } catch {}
    fetchTemperatureReadings(mode)
  }

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab)
    try {
      localStorage.setItem(TAB_STORAGE_KEY, newTab)
    } catch {}
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <Header
        lastRefresh={lastRefresh}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex gap-1 rounded-xl bg-dark-800 p-1 w-fit mb-6">
          <button
            type="button"
            onClick={() => handleTabChange("dashboard")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              tab === "dashboard"
                ? "bg-white/10 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("webhooks")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              tab === "webhooks"
                ? "bg-white/10 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Webhooks
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("switches")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              tab === "switches"
                ? "bg-white/10 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Switches
          </button>
        </div>
      </div>
      {tab === "dashboard" ? (
        <>
          <div className="mx-auto max-w-7xl space-y-6 px-4 pb-6 sm:px-6 sm:pb-8">
            <TemperatureHumidity
              readings={temperatureReadings}
              loading={temperatureReadingsLoading}
              aggregation={temperatureAggregation}
              onAggregationChange={handleTemperatureAggregationChange}
            />
            <SensorReadings
              readings={readings}
              loading={readingsLoading}
              aggregation={aggregation}
              onAggregationChange={handleAggregationChange}
            />
          </div>
          <DeviceGrid
            devices={devices}
            loading={loading}
            error={error}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />
        </>
      ) : tab === "webhooks" ? (
        <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 sm:pb-8">
          <WebhookEvents
            events={webhookEvents}
            loading={webhooksLoading}
          />
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 sm:pb-8">
          <SwitchStatus
            switches={switchStates}
            switchLog={switchLog}
            loading={switchesLoading}
            logLoading={switchLogLoading}
          />
        </div>
      )}
    </div>
  )
}

export default App

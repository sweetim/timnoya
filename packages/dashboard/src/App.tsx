import { useCallback, useEffect, useState } from "react";
import "./index.css";

type DeviceStatus = {
  name: string;
  type: string;
  kind: "physical" | "infrared";
  error?: boolean;
} & Record<string, unknown>;

type StatusResponse = {
  statuses: DeviceStatus[];
};

const KNOWN_FIELDS = new Set(["name", "type", "kind", "error", "deviceId", "hubDeviceId"]);

function BatteryIndicator({ value }: { value: number }) {
  const color =
    value > 60 ? "bg-green-500" : value > 20 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 w-20 rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-sm text-gray-600">{value}%</span>
    </div>
  );
}

function PositionIndicator({ value }: { value: string | number }) {
  const num = typeof value === "string" ? Number(value) : value;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 w-20 rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-500"
          style={{ width: `${num}%` }}
        />
      </div>
      <span className="text-sm text-gray-600">{num}%</span>
    </div>
  );
}

function BooleanBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        value
          ? "bg-green-100 text-green-800"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {label}: {value ? "Yes" : "No"}
    </span>
  );
}

function formatValue(key: string, value: unknown): React.ReactNode {
  if (typeof value === "boolean") return <BooleanBadge value={value} label={key} />;
  if (key === "battery" && typeof value === "number") return <BatteryIndicator value={value} />;
  if (key === "slidePosition") return <PositionIndicator value={value as string | number} />;
  return <span className="text-sm text-gray-700">{String(value)}</span>;
}

function typeIcon(type: string): string {
  const lower = type.toLowerCase();
  if (lower.includes("curtain")) return "\u{1F3E0}";
  if (lower.includes("meter")) return "\u{1F321}\u{FE0F}";
  if (lower.includes("bot")) return "\u{1F916}";
  if (lower.includes("plug")) return "\u{1F50C}";
  if (lower.includes("hub")) return "\u{1F310}";
  return "\u{1F4E1}";
}

function DeviceCard({ device }: { device: DeviceStatus }) {
  const extraEntries = Object.entries(device).filter(
    ([k]) => !KNOWN_FIELDS.has(k) && device[k] !== undefined,
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{typeIcon(device.type)}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{device.name}</h3>
            <p className="text-xs text-gray-500">{device.type}</p>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            device.kind === "physical"
              ? "bg-blue-100 text-blue-700"
              : "bg-purple-100 text-purple-700"
          }`}
        >
          {device.kind}
        </span>
      </div>

      {device.error ? (
        <p className="text-sm text-red-500">Failed to fetch status</p>
      ) : extraEntries.length === 0 ? (
        <p className="text-sm text-gray-400">No status data available</p>
      ) : (
        <dl className="space-y-2">
          {extraEntries.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <dt className="text-sm font-medium text-gray-500">{key}</dt>
              <dd>{formatValue(key, value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-gray-200" />
          <div>
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="mt-1 h-3 w-20 rounded bg-gray-200" />
          </div>
        </div>
        <div className="h-5 w-16 rounded-full bg-gray-200" />
      </div>
      <div className="space-y-2">
        <div className="h-4 rounded bg-gray-100" />
        <div className="h-4 w-3/4 rounded bg-gray-100" />
        <div className="h-4 w-1/2 rounded bg-gray-100" />
      </div>
    </div>
  );
}

export function App() {
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/devices/status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: StatusResponse = await res.json();
      setDevices(data.statuses);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatuses]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">timnoya</h1>
            <p className="text-sm text-gray-500">SwitchBot Device Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-gray-400">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => { setLoading(true); fetchStatuses(); }}
              disabled={loading}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Error: {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : devices.length === 0 ? (
          <div className="py-20 text-center text-gray-400">No devices found</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {devices.map((device) => (
              <DeviceCard key={device.name} device={device} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

import { useCallback, useEffect, useState } from "react";
import type { DeviceStatus, StatusResponse } from "@/types";
import { Header } from "@/components/Header";
import { DeviceGrid } from "@/components/DeviceGrid";
import "./index.css";

export function App() {
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatuses]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatuses();
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <Header lastRefresh={lastRefresh} refreshing={refreshing} onRefresh={handleRefresh} />
      <DeviceGrid devices={devices} loading={loading} error={error} />
    </div>
  );
}

export default App;

"use client";
import { useState, useEffect } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { alertsApi } from "@/lib/api";
import type { Alert } from "@/types";
import { toast } from "sonner";

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    alertsApi.list().then((r) => setAlerts(r.data)).catch(() => {});
  }, []);

  async function addAlert(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const { data } = await alertsApi.create(keyword.trim());
      setAlerts((prev) => [data, ...prev]);
      setKeyword("");
      toast.success(`Alert created for "${keyword.trim()}"`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to create alert";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function removeAlert(id: string, kw: string) {
    await alertsApi.delete(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast.success(`Alert for "${kw}" removed`);
  }

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-on-surface">Job Alerts</h2>
        <span className="text-xs text-on-surface-variant ml-auto">
          Get emailed when matching jobs are found
        </span>
      </div>

      <form onSubmit={addAlert} className="flex gap-2 mb-4">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="e.g. Software Engineer, Data Scientist…"
          className="flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
        <button
          type="submit"
          disabled={loading || !keyword.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>

      {alerts.length === 0 ? (
        <p className="text-sm text-on-surface-variant text-center py-4">
          No alerts yet — add a job role above to get notified
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-lg bg-surface-container-low border border-outline-variant px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-sm text-on-surface font-medium">
                  {a.role_keyword}
                </span>
              </div>
              <button
                onClick={() => removeAlert(a.id, a.role_keyword)}
                className="p-1 text-on-surface-variant hover:text-error transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useNotificationStore } from "@/store/notificationStore";
import { timeAgo } from "@/lib/utils";
import { Activity } from "lucide-react";

export function ActivityFeed() {
  const notifications = useNotificationStore((s) => s.notifications.slice(0, 10));

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="font-display font-semibold text-on-surface">Recent Activity</h2>
      </div>
      {notifications.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-4 text-center">No recent activity yet</p>
      ) : (
        <div className="space-y-0.5">
          {notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-3 py-2">
              <div
                className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                  !n.read ? "bg-primary" : "bg-on-surface-variant/25"
                }`}
              />
              <div className="min-w-0">
                <p
                  className={`text-sm leading-snug truncate ${
                    !n.read ? "text-on-surface font-medium" : "text-on-surface-variant"
                  }`}
                >
                  {n.title}
                </p>
                <p className="text-xs text-on-surface-variant/60 mt-0.5">{timeAgo(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

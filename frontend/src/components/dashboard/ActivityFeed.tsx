"use client";

import { useNotificationStore } from "@/store/notificationStore";
import { timeAgo } from "@/lib/utils";
import { Bell } from "lucide-react";

export function ActivityFeed() {
  const notifications = useNotificationStore((s) => s.notifications.slice(0, 10));

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Activity</h2>
      </div>
      {notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className={`text-sm ${!n.read ? "font-medium" : "text-muted-foreground"}`}>
              <p>{n.title}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

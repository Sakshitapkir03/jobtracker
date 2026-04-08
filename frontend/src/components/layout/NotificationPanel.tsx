"use client";

import { useNotificationStore } from "@/store/notificationStore";
import { useMarkAllNotificationsRead, useMarkNotificationRead } from "@/hooks/useNotifications";
import { timeAgo } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">Notifications</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => markAllRead.mutate()}
          >
            Mark all read
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No notifications</p>
        ) : (
          notifications.slice(0, 20).map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead.mutate(n.id)}
              className={`cursor-pointer border-b px-4 py-3 transition-colors hover:bg-accent ${
                !n.read ? "bg-primary/5" : ""
              }`}
            >
              <p className={`text-sm ${!n.read ? "font-medium" : ""}`}>{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
    <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-outline-variant bg-surface-container shadow-[0_0_24px_rgba(0,209,255,0.1)]">
      <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <span className="font-semibold text-on-surface text-sm">Notifications</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-on-surface-variant hover:text-on-surface"
            onClick={() => markAllRead.mutate()}
          >
            Mark all read
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-on-surface-variant hover:text-on-surface"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="p-6 text-center text-sm text-on-surface-variant">No notifications</p>
        ) : (
          notifications.slice(0, 20).map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead.mutate(n.id)}
              className={`cursor-pointer border-b border-outline-variant/50 last:border-0 px-4 py-3 transition-colors hover:bg-surface-container-high ${
                !n.read ? "bg-primary/5" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                {!n.read && (
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                )}
                <div className={!n.read ? "" : "pl-3.5"}>
                  <p
                    className={`text-sm ${
                      !n.read ? "font-medium text-on-surface" : "text-on-surface-variant"
                    }`}
                  >
                    {n.title}
                  </p>
                  <p className="text-xs text-on-surface-variant/70 mt-0.5">{n.body}</p>
                  <p className="mt-1 text-[11px] text-on-surface-variant/50">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

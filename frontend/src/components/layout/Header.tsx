"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationPanel } from "@/components/layout/NotificationPanel";
import { useNotificationStore } from "@/store/notificationStore";
import { useNotifications } from "@/hooks/useNotifications";
import { useState } from "react";

export function Header() {
  useNotifications(); // subscribe to realtime
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-end border-b bg-card px-6">
      <div className="relative">
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
        {open && <NotificationPanel onClose={() => setOpen(false)} />}
      </div>
    </header>
  );
}

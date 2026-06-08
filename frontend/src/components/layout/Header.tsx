"use client";

import { Bell, Search, Settings } from "lucide-react";
import { NotificationPanel } from "@/components/layout/NotificationPanel";
import { useNotificationStore } from "@/store/notificationStore";
import { useNotifications } from "@/hooks/useNotifications";
import { useState } from "react";

export function Header() {
  useNotifications();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between border-b border-outline-variant bg-background/80 backdrop-blur-md px-6 shrink-0 gap-4 sticky top-0 z-50">
      {/* Search */}
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
        <input
          type="text"
          placeholder="Search companies, sponsors, or industries..."
          className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            className="p-2 text-on-surface-variant hover:text-primary transition-colors"
            onClick={() => setOpen((v) => !v)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {open && <NotificationPanel onClose={() => setOpen(false)} />}
        </div>
        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
          <Settings className="h-5 w-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center text-xs font-bold text-on-surface-variant">
          S
        </div>
      </div>
    </header>
  );
}

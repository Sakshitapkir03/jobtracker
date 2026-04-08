import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";
import { useNotificationStore } from "@/store/notificationStore";
import { createClient } from "@/lib/supabase/client";

export function useNotifications() {
  const { setNotifications, addNotification } = useNotificationStore();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    refetchInterval: 30_000,
  });

  // Sync into Zustand store
  useEffect(() => {
    if (query.data) setNotifications(query.data);
  }, [query.data, setNotifications]);

  // Supabase Realtime – listen for new notifications
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          addNotification(payload.new as any);
          qc.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [addNotification, qc]);

  return query;
}

export function useMarkNotificationRead() {
  const { markRead } = useNotificationStore();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: (_, id) => markRead(id),
  });
}

export function useMarkAllNotificationsRead() {
  const { markAllRead } = useNotificationStore();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => markAllRead(),
  });
}

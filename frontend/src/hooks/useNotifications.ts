import { useQuery, useMutation } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
  });
}

export function useMarkAllNotificationsRead() {
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
  });
}

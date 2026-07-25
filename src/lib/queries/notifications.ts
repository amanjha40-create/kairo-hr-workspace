import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUnreadNotificationCount,
  listAllNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { mapNotificationRecord } from "@/lib/notifications";

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationQueryKeys.all, "list"] as const,
  unreadCount: () => [...notificationQueryKeys.all, "unread-count"] as const,
};

export function notificationsListQueryOptions() {
  return queryOptions({
    queryKey: notificationQueryKeys.list(),
    queryFn: async () => (await listAllNotifications()).map(mapNotificationRecord),
    retry: false,
  });
}

export function notificationUnreadCountQueryOptions() {
  return queryOptions({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: async () => (await getUnreadNotificationCount()).unread_count,
    retry: false,
  });
}

export function useNotificationsQuery() {
  return useQuery(notificationsListQueryOptions());
}

export function useNotificationUnreadCountQuery() {
  return useQuery(notificationUnreadCountQueryOptions());
}

async function invalidateNotificationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationPublicId: string) => {
      await markNotificationRead(notificationPublicId);
      return notificationPublicId;
    },
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient);
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient);
    },
  });
}

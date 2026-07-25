import { apiRequest } from "@/lib/api/client";

export interface BackendPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  offset: number;
  limit: number;
}

export interface BackendUserNotificationResponse {
  public_id: string;
  category: string;
  event_type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface BackendNotificationUnreadCountResponse {
  unread_count: number;
}

export interface NotificationListParams {
  page?: number;
  page_size?: number;
}

function buildQueryString(params: NotificationListParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", String(params.page));
  if (params.page_size) searchParams.set("page_size", String(params.page_size));

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function listNotifications(params: NotificationListParams = {}) {
  return apiRequest<BackendPage<BackendUserNotificationResponse>>(
    `/api/v1/notifications${buildQueryString(params)}`,
  );
}

export async function listAllNotifications(params: NotificationListParams = {}) {
  const pageSize = params.page_size ?? 100;
  const firstPage = params.page ?? 1;
  const firstResponse = await listNotifications({
    ...params,
    page: firstPage,
    page_size: pageSize,
  });

  const items = [...firstResponse.items];

  for (let page = firstResponse.page + 1; page <= firstResponse.total_pages; page += 1) {
    const response = await listNotifications({
      ...params,
      page,
      page_size: pageSize,
    });
    items.push(...response.items);
  }

  return items;
}

export function getUnreadNotificationCount() {
  return apiRequest<BackendNotificationUnreadCountResponse>("/api/v1/notifications/unread-count");
}

export function markNotificationRead(notificationPublicId: string) {
  return apiRequest<void>(`/api/v1/notifications/${notificationPublicId}/read`, {
    method: "POST",
  });
}

export function markAllNotificationsRead() {
  return apiRequest<void>("/api/v1/notifications/read-all", {
    method: "POST",
  });
}

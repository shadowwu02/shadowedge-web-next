import type {
  StudioProjectActivityFeed,
  StudioProjectNotification,
  StudioProjectNotificationFeed,
} from "@/features/studio/capabilities/studioProjectActivity";
import { apiRequest } from "@/lib/api";

export async function getStudioProjectActivity(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioProjectActivityFeed>(
    `/api/projects/${encodeURIComponent(projectId)}/activity`,
    { signal },
  );
  if (response.data?.projectId !== projectId || !Array.isArray(response.data.activities)) {
    throw new Error("Project Activity response was incomplete.");
  }
  return response.data;
}

export async function getStudioNotifications(signal?: AbortSignal) {
  const response = await apiRequest<StudioProjectNotificationFeed>("/api/notifications", { signal });
  if (!Array.isArray(response.data?.notifications)) {
    throw new Error("Project Notifications response was incomplete.");
  }
  return response.data;
}

export async function markStudioNotificationRead(notificationId: string) {
  return (await apiRequest<StudioProjectNotification>(
    `/api/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "POST" },
  )).data;
}

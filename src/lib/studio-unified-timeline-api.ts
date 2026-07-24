import type {
  StudioCreativeScenes,
  StudioUnifiedTimeline,
} from "@/features/studio/capabilities/studioUnifiedTimeline";
import { apiRequest } from "@/lib/api";

export async function getStudioUnifiedTimeline(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioUnifiedTimeline>(
    `/api/projects/${encodeURIComponent(projectId)}/timeline`,
    { signal },
  );
  if (!response.data?.projectId || !Array.isArray(response.data.clips)) {
    throw new Error("Unified Timeline response was incomplete.");
  }
  return response.data;
}

export async function getStudioCreativeScenes(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioCreativeScenes>(
    `/api/projects/${encodeURIComponent(projectId)}/scenes`,
    { signal },
  );
  if (!response.data?.projectId || !Array.isArray(response.data.scenes)) {
    throw new Error("Creative Scenes response was incomplete.");
  }
  return response.data;
}

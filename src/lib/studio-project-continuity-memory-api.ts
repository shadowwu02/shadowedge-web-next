import type { StudioProjectMemorySnapshot } from "@/features/studio/capabilities/studioProjectContinuityMemory";
import { apiRequest } from "@/lib/api";

export async function getStudioProjectContinuityMemory(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioProjectMemorySnapshot>(
    `/api/projects/${encodeURIComponent(projectId)}/memory`,
    { signal },
  );
  if (!response.data?.projectId) throw new Error("Project Memory Snapshot was not returned.");
  return response.data;
}

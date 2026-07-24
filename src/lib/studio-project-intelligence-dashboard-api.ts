import type { StudioCreativeProjectSnapshot } from "@/features/studio/capabilities/studioCreativeProjectIntelligence";
import { apiRequest } from "@/lib/api";

export async function getStudioCreativeProjectIntelligence(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioCreativeProjectSnapshot>(
    `/api/projects/${encodeURIComponent(projectId)}/intelligence`,
    { signal },
  );
  if (!response.data?.projectId) throw new Error("Project Intelligence Snapshot was not returned.");
  return response.data;
}

import { apiRequest } from "@/lib/api";
import type { StudioAdaptivePlanningBundle } from "@/features/studio/capabilities/studioAdaptivePlanning";

export async function getStudioAdaptiveSuggestions(projectId: string) {
  const envelope = await apiRequest<StudioAdaptivePlanningBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/adaptive-suggestions`,
  );
  if (!Array.isArray(envelope.data?.suggestions)) throw new Error("Adaptive Suggestions were not returned.");
  return envelope.data;
}

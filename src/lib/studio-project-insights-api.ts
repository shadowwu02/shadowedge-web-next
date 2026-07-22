import { apiRequest } from "@/lib/api";
import type { StudioProjectInsightBundle } from "@/features/studio/capabilities/studioProjectInsights";

export async function getStudioProjectInsights(projectId: string) {
  const envelope = await apiRequest<StudioProjectInsightBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/insights`,
  );
  if (!envelope.data?.projectId || !Array.isArray(envelope.data.insights)) throw new Error("Project Insights were not returned.");
  return envelope.data;
}

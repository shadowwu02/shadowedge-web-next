import { apiRequest } from "@/lib/api";
import type { StudioProjectStrategyBundle } from "@/features/studio/capabilities/studioProjectStrategies";

export async function getStudioProjectStrategies(projectId: string) {
  const envelope = await apiRequest<StudioProjectStrategyBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/strategies`,
  );
  if (!envelope.data?.projectId || !Array.isArray(envelope.data.strategies)) throw new Error("Project Strategies were not returned.");
  return envelope.data;
}

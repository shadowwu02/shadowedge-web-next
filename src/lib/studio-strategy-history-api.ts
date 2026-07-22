import { apiRequest } from "@/lib/api";
import type { StudioStrategyHistoryBundle } from "@/features/studio/capabilities/studioStrategyLearning";

export async function getStudioStrategyHistory(projectId: string) {
  const envelope = await apiRequest<StudioStrategyHistoryBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/strategy-history`,
  );
  if (!envelope.data?.projectId || !Array.isArray(envelope.data.history)) throw new Error("Project Strategy History was not returned.");
  return envelope.data;
}

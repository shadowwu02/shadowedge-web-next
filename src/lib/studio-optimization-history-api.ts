import { apiRequest } from "@/lib/api";
import type { StudioOptimizationHistoryBundle } from "@/features/studio/capabilities/studioOptimizationLearning";

export async function getStudioOptimizationHistory(projectId: string) {
  const envelope = await apiRequest<StudioOptimizationHistoryBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/optimization-history`,
  );
  if (envelope.data?.projectId !== projectId || !Array.isArray(envelope.data.history)) throw new Error("Creative Optimization History was not returned.");
  return envelope.data;
}

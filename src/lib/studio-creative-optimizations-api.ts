import { apiRequest } from "@/lib/api";
import type { StudioCreativeOptimizations } from "@/features/studio/capabilities/studioCreativeOptimizations";

export async function getStudioCreativeOptimizations(projectId: string) {
  const envelope = await apiRequest<StudioCreativeOptimizations>(`/api/projects/${encodeURIComponent(projectId)}/optimizations`);
  if (envelope.data?.projectId !== projectId || !Array.isArray(envelope.data.proposals)) throw new Error("Creative Optimizations were not returned.");
  return envelope.data;
}

import { apiRequest } from "@/lib/api";
import type { StudioDecisionSupportBundle } from "@/features/studio/capabilities/studioDecisionSupport";

export async function getStudioDecisionSupport(projectId: string) {
  const envelope = await apiRequest<StudioDecisionSupportBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/decision-support`,
  );
  if (!Array.isArray(envelope.data?.options)) throw new Error("Decision Support options were not returned.");
  return envelope.data;
}

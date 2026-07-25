import type {
  StudioClientFeedbackConfirmation,
  StudioClientFeedbackIntelligence,
} from "@/features/studio/capabilities/studioClientFeedbackIntelligence";
import { apiRequest } from "@/lib/api";

export async function getStudioClientInsights(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioClientFeedbackIntelligence>(
    `/api/projects/${encodeURIComponent(projectId)}/client-insights`,
    { signal },
  );
  if (!response.data?.projectId || !Array.isArray(response.data.patterns)) {
    throw new Error("Client Insights were not returned.");
  }
  return response.data;
}

export async function confirmStudioClientInsight(
  projectId: string,
  patternId: string,
) {
  const response = await apiRequest<StudioClientFeedbackConfirmation>(
    `/api/projects/${encodeURIComponent(projectId)}/client-insights/${encodeURIComponent(patternId)}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    },
  );
  if (!response.data?.pattern?.patternId || !response.data.memoryDraft?.draftId) {
    throw new Error("Project Memory Draft was not returned.");
  }
  return response.data;
}

import type { StudioCopilotExplanationBundle } from "@/features/studio/capabilities/studioCopilotExplanation";
import { apiRequest } from "@/lib/api";

export async function getStudioCopilotExplanations(projectId: string) {
  const envelope = await apiRequest<StudioCopilotExplanationBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot/explanations`,
  );
  if (!Array.isArray(envelope.data?.explanations)) throw new Error("Copilot explanations were not returned.");
  return envelope.data;
}

import { apiRequest } from "@/lib/api";
import type {
  StudioCopilotSuggestionAction,
  StudioCopilotSuggestionActionResult,
  StudioProjectCopilotState,
} from "@/features/studio/capabilities/studioProjectCopilot";

export async function getStudioProjectCopilot(projectId: string) {
  const envelope = await apiRequest<StudioProjectCopilotState>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot`,
  );
  if (!envelope.data?.projectId) throw new Error("Project Copilot state was not returned.");
  return envelope.data;
}

export async function actOnStudioCopilotSuggestion(
  projectId: string,
  suggestionId: string,
  action: StudioCopilotSuggestionAction,
) {
  const envelope = await apiRequest<StudioCopilotSuggestionActionResult>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot/suggestions/${encodeURIComponent(suggestionId)}/action`,
    { method: "POST", body: JSON.stringify({ action }) },
  );
  if (!envelope.data?.state?.projectId) throw new Error("Project Copilot action was not recorded.");
  return envelope.data;
}

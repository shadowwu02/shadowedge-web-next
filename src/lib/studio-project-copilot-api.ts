import { apiRequest } from "@/lib/api";
import type {
  StudioCopilotActionConfirmResult,
  StudioCopilotActionPreviewResult,
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

export async function previewStudioCopilotAction(projectId: string, actionId: string) {
  const envelope = await apiRequest<StudioCopilotActionPreviewResult>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot/actions/${encodeURIComponent(actionId)}/preview`,
    { method: "POST" },
  );
  if (!envelope.data?.action || !envelope.data.state?.projectId) throw new Error("Copilot action preview was not returned.");
  return envelope.data;
}

export async function confirmStudioCopilotAction(projectId: string, actionId: string) {
  const envelope = await apiRequest<StudioCopilotActionConfirmResult>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot/actions/${encodeURIComponent(actionId)}/confirm`,
    { method: "POST", body: JSON.stringify({ confirm: true }) },
  );
  if (!envelope.data?.draft || !envelope.data.state?.projectId) throw new Error("Copilot Draft was not returned.");
  return envelope.data;
}

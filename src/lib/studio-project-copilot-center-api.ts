import type {
  StudioProjectActionDraft,
  StudioProjectActionPreview,
  StudioProjectCopilotSnapshot,
} from "@/features/studio/capabilities/studioProjectCopilotCenter";
import { apiRequest } from "@/lib/api";

export async function getStudioProjectCopilotCenter(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioProjectCopilotSnapshot>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot-center`,
    { signal },
  );
  if (!response.data?.projectId) throw new Error("Project Copilot Snapshot was not returned.");
  return response.data;
}

export async function previewStudioProjectAction(projectId: string, recommendationId: string) {
  const response = await apiRequest<StudioProjectActionPreview>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot-center/actions/${encodeURIComponent(recommendationId)}/preview`,
    { method: "POST" },
  );
  if (!response.data?.action?.actionId) throw new Error("Project Action preview was not returned.");
  return response.data;
}

export async function confirmStudioProjectAction(projectId: string, recommendationId: string) {
  const response = await apiRequest<Readonly<{
    action: StudioProjectActionPreview["action"];
    draft: StudioProjectActionDraft;
  }>>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot-center/actions/${encodeURIComponent(recommendationId)}/confirm`,
    { method: "POST", body: JSON.stringify({ confirm: true }) },
  );
  if (!response.data?.draft?.draftId) throw new Error("Project Action Draft was not returned.");
  return response.data;
}

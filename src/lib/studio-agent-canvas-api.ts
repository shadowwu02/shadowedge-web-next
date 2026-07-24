import type {
  StudioAgentCanvasGraph,
  StudioCanvasDraftActionConfirmResult,
  StudioCanvasDraftActionPreviewResult,
  StudioCanvasDraftActionType,
} from "@/features/studio/capabilities/studioAgentCanvas";
import { apiRequest } from "@/lib/api";

export async function getStudioAgentCanvas(projectId: string) {
  const response = await apiRequest<StudioAgentCanvasGraph>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas`,
  );
  if (!response.data?.projectId) throw new Error("Agent Canvas response was incomplete.");
  return response.data;
}

export async function previewStudioCanvasDraftAction(
  projectId: string,
  nodeId: string,
  input: { actionType: StudioCanvasDraftActionType; insightId?: string | null },
) {
  const response = await apiRequest<StudioCanvasDraftActionPreviewResult>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas/actions/${encodeURIComponent(nodeId)}/preview`,
    { method: "POST", body: JSON.stringify(input) },
  );
  if (!response.data?.action || response.data.action.status !== "PREVIEWED") throw new Error("Canvas Draft Action preview was not returned.");
  return response.data;
}

export async function confirmStudioCanvasDraftAction(projectId: string, nodeId: string, actionId: string) {
  const response = await apiRequest<StudioCanvasDraftActionConfirmResult>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas/actions/${encodeURIComponent(nodeId)}/confirm`,
    { method: "POST", body: JSON.stringify({ actionId, confirm: true }) },
  );
  if (!response.data?.draft || response.data.draft.status !== "DRAFT") throw new Error("Canvas Draft was not returned.");
  return response.data;
}

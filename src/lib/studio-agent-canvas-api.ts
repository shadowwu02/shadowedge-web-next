import type {
  StudioAgentCanvasGraph,
  StudioCanvasProductionResults,
  StudioCanvasWorkflowChange,
  StudioCanvasWorkflowDraft,
  StudioCanvasExecutionApproval,
  StudioCanvasExecutionPreview,
  StudioCanvasExecutionStatusProjection,
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

export async function getStudioCanvasProductionResults(projectId: string) {
  const response = await apiRequest<StudioCanvasProductionResults>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas/results`,
  );
  if (!response.data?.projectId || !Array.isArray(response.data.bindings)) {
    throw new Error("Canvas production results response was incomplete.");
  }
  return response.data;
}

export async function createStudioCanvasWorkflowDraft(
  projectId: string,
  changes: readonly StudioCanvasWorkflowChange[],
) {
  const response = await apiRequest<StudioCanvasWorkflowDraft>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas/workflow-draft`,
    { method: "POST", body: JSON.stringify({ changes }) },
  );
  if (!response.data?.draftId || response.data.status !== "DRAFT") {
    throw new Error("Canvas Workflow Draft was not returned.");
  }
  return response.data;
}

export async function getStudioCanvasWorkflowDraft(projectId: string, draftId: string) {
  const response = await apiRequest<StudioCanvasWorkflowDraft>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas/workflow-draft/${encodeURIComponent(draftId)}`,
  );
  if (!response.data?.draftId) throw new Error("Canvas Workflow Draft was not found.");
  return response.data;
}

export async function confirmStudioCanvasWorkflowDraft(projectId: string, draftId: string) {
  const response = await apiRequest<StudioCanvasWorkflowDraft>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas/workflow-draft/${encodeURIComponent(draftId)}/confirm`,
    { method: "POST", body: JSON.stringify({ confirm: true }) },
  );
  if (response.data?.status !== "CONFIRMED") throw new Error("Canvas Workflow Draft was not confirmed.");
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

export async function createStudioCanvasExecutionPreview(projectId: string, canvasActionId?: string | null) {
  const response = await apiRequest<StudioCanvasExecutionPreview>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas/execution-preview`,
    {
      method: "POST",
      body: JSON.stringify(canvasActionId ? { canvasActionId } : {}),
    },
  );
  if (!response.data?.previewId) throw new Error("Canvas Execution Preview was not returned.");
  return response.data;
}

export async function confirmStudioCanvasExecutionPreview(projectId: string, previewId: string) {
  const response = await apiRequest<StudioCanvasExecutionPreview>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas/execution-preview/${encodeURIComponent(previewId)}/confirm`,
    { method: "POST", body: JSON.stringify({ confirm: true }) },
  );
  if (response.data?.status !== "CONFIRMED") throw new Error("Canvas Execution Preview was not confirmed.");
  return response.data;
}

export async function createStudioCanvasExecutionApproval(
  projectId: string,
  input: { runPlanId: string; executionPreviewId: string },
) {
  const response = await apiRequest<StudioCanvasExecutionApproval>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas/execution-approval`,
    { method: "POST", body: JSON.stringify(input) },
  );
  if (!response.data?.approvalId) throw new Error("Canvas Execution Approval was not returned.");
  return response.data;
}

export async function confirmStudioCanvasExecutionApproval(projectId: string, approvalId: string) {
  const response = await apiRequest<StudioCanvasExecutionApproval>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas/execution-approval/${encodeURIComponent(approvalId)}/confirm`,
    { method: "POST", body: JSON.stringify({ confirm: true }) },
  );
  if (response.data?.status !== "APPROVED") throw new Error("Canvas Execution Approval was not approved.");
  return response.data;
}

export async function getStudioCanvasExecutionStatus(projectId: string) {
  const response = await apiRequest<StudioCanvasExecutionStatusProjection>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas/execution-status`,
  );
  if (!response.data?.projectId || !Array.isArray(response.data.executions)) {
    throw new Error("Canvas Execution Status was not returned.");
  }
  return response.data;
}

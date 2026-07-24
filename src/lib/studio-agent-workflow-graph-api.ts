import type {
  StudioAgentWorkflowDraft,
  StudioAgentWorkflowDraftChange,
  StudioAgentWorkflowGraph,
} from "@/features/studio/capabilities/studioAgentWorkflowGraph";
import { apiRequest } from "@/lib/api";

export async function getStudioAgentWorkflowGraph(projectId: string) {
  const response = await apiRequest<StudioAgentWorkflowGraph>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-workflow-graph`,
  );
  if (!response.data?.graphId || response.data.projectId !== projectId) {
    throw new Error("Agent Workflow Graph was not returned.");
  }
  return response.data;
}

export async function createStudioAgentWorkflowDraft(
  projectId: string,
  changes: readonly StudioAgentWorkflowDraftChange[],
) {
  const response = await apiRequest<StudioAgentWorkflowDraft>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-workflow-graph/draft`,
    { method: "POST", body: JSON.stringify({ changes }) },
  );
  if (!response.data?.draftId || response.data.status !== "DRAFT") {
    throw new Error("Agent Workflow Draft was not returned.");
  }
  return response.data;
}

export async function getStudioAgentWorkflowDraft(projectId: string, draftId: string) {
  const response = await apiRequest<StudioAgentWorkflowDraft>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-workflow-graph/draft/${encodeURIComponent(draftId)}`,
  );
  if (!response.data?.draftId) throw new Error("Agent Workflow Draft was not found.");
  return response.data;
}

export async function confirmStudioAgentWorkflowDraft(projectId: string, draftId: string) {
  const response = await apiRequest<StudioAgentWorkflowDraft>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-workflow-graph/draft/${encodeURIComponent(draftId)}/confirm`,
    { method: "POST", body: JSON.stringify({ confirm: true }) },
  );
  if (response.data?.status !== "CONFIRMED") throw new Error("Agent Workflow Draft was not confirmed.");
  return response.data;
}

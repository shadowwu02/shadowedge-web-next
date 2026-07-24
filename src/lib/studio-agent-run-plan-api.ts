import type { StudioAgentRunPlan } from "@/features/studio/capabilities/studioAgentRunPlan";
import { apiRequest } from "@/lib/api";

export async function createStudioAgentRunPlan(projectId: string, graphId: string) {
  const response = await apiRequest<StudioAgentRunPlan>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas/run-plan`,
    { method: "POST", body: JSON.stringify({ graphId }) },
  );
  if (!response.data?.runPlanId || response.data.projectId !== projectId || response.data.graphId !== graphId) {
    throw new Error("Agent Run Plan was not returned.");
  }
  return response.data;
}

export async function getStudioAgentRunPlan(projectId: string, runPlanId: string) {
  const response = await apiRequest<StudioAgentRunPlan>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas/run-plan/${encodeURIComponent(runPlanId)}`,
  );
  if (!response.data?.runPlanId || response.data.runPlanId !== runPlanId) {
    throw new Error("Agent Run Plan was not found.");
  }
  return response.data;
}

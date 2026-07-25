import type {
  CreateStudioCanvasPlanInput,
  StudioAIPlannedCanvasDraft,
} from "@/features/studio/capabilities/studioCreativeCanvasPlanning";
import { apiRequest } from "@/lib/api";

function assertPlan(value: StudioAIPlannedCanvasDraft | undefined, projectId: string) {
  if (
    !value?.draftId ||
    value.planningRequest?.projectId !== projectId ||
    !value.graph?.graphId ||
    !Array.isArray(value.graph.nodes) ||
    !Array.isArray(value.graph.edges) ||
    !Array.isArray(value.reasoning) ||
    !Array.isArray(value.evidence) ||
    !value.editSession?.sessionId
  ) {
    throw new Error("Creative Canvas Plan response was incomplete.");
  }
  return value;
}

export async function createStudioCreativeCanvasPlan(
  projectId: string,
  input: CreateStudioCanvasPlanInput,
) {
  const response = await apiRequest<StudioAIPlannedCanvasDraft>(
    `/api/projects/${encodeURIComponent(projectId)}/creative-canvas/plan`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return assertPlan(response.data, projectId);
}

export async function getStudioCreativeCanvasPlan(
  projectId: string,
  draftId: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<StudioAIPlannedCanvasDraft>(
    `/api/projects/${encodeURIComponent(projectId)}/creative-canvas/plan/${encodeURIComponent(draftId)}`,
    { signal },
  );
  return assertPlan(response.data, projectId);
}

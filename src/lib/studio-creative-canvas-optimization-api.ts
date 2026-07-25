import type {
  CreateStudioCanvasOptimizationInput,
  StudioAIOptimizedCanvasDraft,
} from "@/features/studio/capabilities/studioCreativeCanvasOptimization";
import { apiRequest } from "@/lib/api";

function assertOptimization(value: StudioAIOptimizedCanvasDraft | undefined) {
  if (
    !value?.draftId ||
    !value.optimizationRequest?.requestId ||
    !value.optimizedGraph?.graphId ||
    !Array.isArray(value.optimizedGraph.nodes) ||
    !Array.isArray(value.optimizedGraph.edges) ||
    !Array.isArray(value.changes) ||
    !Array.isArray(value.reasons) ||
    !Array.isArray(value.evidence) ||
    !value.editSession?.sessionId
  ) {
    throw new Error("Creative Canvas Optimization response was incomplete.");
  }
  return value;
}

export async function createStudioCreativeCanvasOptimization(
  projectId: string,
  input: CreateStudioCanvasOptimizationInput,
) {
  const response = await apiRequest<StudioAIOptimizedCanvasDraft>(
    `/api/projects/${encodeURIComponent(projectId)}/creative-canvas/optimize`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return assertOptimization(response.data);
}

export async function getStudioCreativeCanvasOptimization(
  projectId: string,
  draftId: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<StudioAIOptimizedCanvasDraft>(
    `/api/projects/${encodeURIComponent(projectId)}/creative-canvas/optimize/${encodeURIComponent(draftId)}`,
    { signal },
  );
  return assertOptimization(response.data);
}

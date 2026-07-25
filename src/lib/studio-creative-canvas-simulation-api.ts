import type { StudioCanvasChangeSimulation } from "@/features/studio/capabilities/studioCreativeCanvasSimulation";
import { apiRequest } from "@/lib/api";

function assertSimulation(value: StudioCanvasChangeSimulation | undefined, draftId?: string) {
  if (
    !value?.simulationId ||
    !value.draftId ||
    (draftId && value.draftId !== draftId) ||
    !value.beforeState?.graphVersion ||
    !value.afterState?.graphVersion ||
    !Array.isArray(value.impact) ||
    !Array.isArray(value.risks)
  ) {
    throw new Error("Creative Canvas Simulation response was incomplete.");
  }
  return value;
}

export async function createStudioCreativeCanvasSimulation(
  projectId: string,
  draftId: string,
) {
  const response = await apiRequest<StudioCanvasChangeSimulation>(
    `/api/projects/${encodeURIComponent(projectId)}/creative-canvas/simulation`,
    {
      method: "POST",
      body: JSON.stringify({ draftId }),
    },
  );
  return assertSimulation(response.data, draftId);
}

export async function getStudioCreativeCanvasSimulation(
  projectId: string,
  simulationId: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<StudioCanvasChangeSimulation>(
    `/api/projects/${encodeURIComponent(projectId)}/creative-canvas/simulation/${encodeURIComponent(simulationId)}`,
    { signal },
  );
  return assertSimulation(response.data);
}

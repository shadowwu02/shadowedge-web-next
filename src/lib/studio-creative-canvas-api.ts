import type { StudioCreativeCanvasGraph } from "@/features/studio/capabilities/studioCreativeCanvas";
import { apiRequest } from "@/lib/api";

export async function getStudioCreativeCanvas(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioCreativeCanvasGraph>(
    `/api/projects/${encodeURIComponent(projectId)}/creative-canvas`,
    { signal },
  );
  if (
    !response.data?.graphId ||
    response.data.projectId !== projectId ||
    !Array.isArray(response.data.nodes) ||
    !Array.isArray(response.data.edges)
  ) {
    throw new Error("Creative Canvas response was incomplete.");
  }
  return response.data;
}

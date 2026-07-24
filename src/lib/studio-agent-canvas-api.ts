import type { StudioAgentCanvasGraph } from "@/features/studio/capabilities/studioAgentCanvas";
import { apiRequest } from "@/lib/api";

export async function getStudioAgentCanvas(projectId: string) {
  const response = await apiRequest<StudioAgentCanvasGraph>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-canvas`,
  );
  if (!response.data?.projectId) throw new Error("Agent Canvas response was incomplete.");
  return response.data;
}

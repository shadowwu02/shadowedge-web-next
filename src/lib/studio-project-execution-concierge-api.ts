import type { StudioProjectExecutionSnapshot } from "@/features/studio/capabilities/studioProjectExecutionConcierge";
import { apiRequest } from "@/lib/api";

export async function getStudioProjectExecutionAssistant(
  projectId: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<StudioProjectExecutionSnapshot>(
    `/api/projects/${encodeURIComponent(projectId)}/execution-assistant`,
    { signal },
  );
  if (
    response.data?.projectId !== projectId ||
    !Array.isArray(response.data.nextActions) ||
    !Array.isArray(response.data.risks)
  ) throw new Error("Project Execution Assistant response was incomplete.");
  return response.data;
}

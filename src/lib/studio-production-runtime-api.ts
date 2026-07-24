import type { StudioProductionRuntimeProjection } from "@/features/studio/capabilities/studioProductionRuntime";
import { apiRequest } from "@/lib/api";

export async function getStudioProductionRunStatus(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioProductionRuntimeProjection>(
    `/api/projects/${encodeURIComponent(projectId)}/production-run/status`,
    { signal },
  );
  if (
    !response.data?.handoff?.handoffId ||
    !response.data?.tracking?.trackingId ||
    !Array.isArray(response.data.tracking.steps)
  ) {
    throw new Error("Production Runtime status was not returned.");
  }
  return response.data;
}

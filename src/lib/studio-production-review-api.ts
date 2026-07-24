import type { StudioProductionReview } from "@/features/studio/capabilities/studioProductionReview";
import { apiRequest } from "@/lib/api";

function assertProductionReview(data: StudioProductionReview | undefined) {
  if (
    !data?.reviewId ||
    !data.productionRunId ||
    !Array.isArray(data.results) ||
    !Array.isArray(data.qualityChecks)
  ) {
    throw new Error("Production Review was not returned.");
  }
  return data;
}

export async function getStudioProductionReview(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioProductionReview>(
    `/api/projects/${encodeURIComponent(projectId)}/production-review`,
    { signal },
  );
  return assertProductionReview(response.data);
}

export async function approveStudioProductionReview(projectId: string, reviewId: string) {
  const response = await apiRequest<StudioProductionReview>(
    `/api/projects/${encodeURIComponent(projectId)}/production-review/${encodeURIComponent(reviewId)}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    },
  );
  return assertProductionReview(response.data);
}

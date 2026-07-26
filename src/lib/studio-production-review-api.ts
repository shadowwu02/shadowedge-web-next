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

export async function getStudioProductionReview(
  projectId: string,
  signal?: AbortSignal,
  productionRunId?: string,
) {
  const controller = new AbortController();
  let timedOut = false;
  const relayAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) relayAbort();
  else signal?.addEventListener("abort", relayAbort, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 10_000);
  try {
    const query = productionRunId
      ? `?productionRunId=${encodeURIComponent(productionRunId)}`
      : "";
    const response = await apiRequest<StudioProductionReview>(
      `/api/projects/${encodeURIComponent(projectId)}/production-review${query}`,
      { signal: controller.signal },
    );
    return assertProductionReview(response.data);
  } catch (reason) {
    if (timedOut) throw new Error("Production Review request timed out.");
    throw reason;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", relayAbort);
  }
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

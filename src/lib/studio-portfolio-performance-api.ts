import { apiRequest } from "@/lib/api";
import type {
  StudioPortfolioPerformanceDraft,
  StudioPortfolioPerformancePreview,
  StudioPortfolioPerformanceSnapshot,
} from "@/features/studio/capabilities/studioPortfolioPerformance";

export async function getStudioPortfolioPerformance(signal?: AbortSignal) {
  const response = await apiRequest<StudioPortfolioPerformanceSnapshot>(
    "/api/portfolio/performance",
    {
      method: "GET",
      signal,
      cache: "no-store",
    },
  );
  if (!response.data?.portfolioId || !Array.isArray(response.data.projects)) {
    throw new Error("Portfolio Performance Intelligence was not returned.");
  }
  return response.data;
}

export async function previewStudioPortfolioPerformanceDraft() {
  const response = await apiRequest<StudioPortfolioPerformancePreview>(
    "/api/portfolio/performance/preview",
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
  if (!response.data?.preview?.portfolioId) {
    throw new Error("Portfolio Performance preview was not returned.");
  }
  return response.data;
}

export async function confirmStudioPortfolioPerformanceDraft() {
  const response = await apiRequest<{
    performance: StudioPortfolioPerformanceSnapshot;
    action: StudioPortfolioPerformancePreview["action"];
    draft: StudioPortfolioPerformanceDraft;
  }>(
    "/api/portfolio/performance/confirm",
    {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    },
  );
  if (!response.data?.draft?.draftId) {
    throw new Error("Portfolio Performance Draft was not returned.");
  }
  return response.data;
}

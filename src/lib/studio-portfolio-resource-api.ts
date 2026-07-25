import type {
  StudioPortfolioResourceDraft,
  StudioPortfolioResourcePreview,
  StudioPortfolioResourceSnapshot,
} from "@/features/studio/capabilities/studioPortfolioResources";
import { apiRequest } from "@/lib/api";

export async function getStudioPortfolioResources(signal?: AbortSignal) {
  const response = await apiRequest<StudioPortfolioResourceSnapshot>(
    "/api/portfolio/resources/intelligence",
    { signal },
  );
  if (!response.data?.portfolioId || !Array.isArray(response.data.opportunities)) {
    throw new Error("Portfolio Resource Intelligence was not returned.");
  }
  return response.data;
}

export async function previewStudioPortfolioResourceDraft() {
  const response = await apiRequest<StudioPortfolioResourcePreview>(
    "/api/portfolio/resources/intelligence/preview",
    { method: "POST" },
  );
  if (!response.data?.preview?.portfolioId) {
    throw new Error("Portfolio Resource preview was not returned.");
  }
  return response.data;
}

export async function confirmStudioPortfolioResourceDraft() {
  const response = await apiRequest<Readonly<{
    resources: StudioPortfolioResourceSnapshot;
    action: StudioPortfolioResourcePreview["action"];
    draft: StudioPortfolioResourceDraft;
  }>>(
    "/api/portfolio/resources/intelligence/confirm",
    { method: "POST", body: JSON.stringify({ confirm: true }) },
  );
  if (!response.data?.draft?.draftId) {
    throw new Error("Portfolio Resource Draft was not returned.");
  }
  return response.data;
}

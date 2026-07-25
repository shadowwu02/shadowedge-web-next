import type {
  StudioPortfolioStrategyDraft,
  StudioPortfolioStrategyPreview,
  StudioPortfolioStrategySnapshot,
} from "@/features/studio/capabilities/studioPortfolioStrategy";
import { apiRequest } from "@/lib/api";

export async function getStudioPortfolioStrategy(signal?: AbortSignal) {
  const response = await apiRequest<StudioPortfolioStrategySnapshot>(
    "/api/portfolio/strategy",
    { signal },
  );
  if (!response.data?.portfolioId || !Array.isArray(response.data.projects)) {
    throw new Error("Portfolio Strategy was not returned.");
  }
  return response.data;
}

export async function previewStudioPortfolioStrategy() {
  const response = await apiRequest<StudioPortfolioStrategyPreview>(
    "/api/portfolio/strategy/preview",
    { method: "POST" },
  );
  if (!response.data?.preview?.portfolioId) {
    throw new Error("Portfolio Strategy preview was not returned.");
  }
  return response.data;
}

export async function confirmStudioPortfolioStrategy() {
  const response = await apiRequest<Readonly<{
    strategy: StudioPortfolioStrategySnapshot;
    action: StudioPortfolioStrategyPreview["action"];
    draft: StudioPortfolioStrategyDraft;
  }>>(
    "/api/portfolio/strategy/confirm",
    { method: "POST", body: JSON.stringify({ confirm: true }) },
  );
  if (!response.data?.draft?.draftId) {
    throw new Error("Portfolio Strategy Draft was not returned.");
  }
  return response.data;
}

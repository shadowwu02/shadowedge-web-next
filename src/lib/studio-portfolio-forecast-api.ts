import { apiRequest } from "@/lib/api";
import type {
  StudioPortfolioForecastDraft,
  StudioPortfolioForecastPreview,
  StudioPortfolioForecastSnapshot,
} from "@/features/studio/capabilities/studioPortfolioForecast";

export async function getStudioPortfolioForecast(signal?: AbortSignal) {
  const response = await apiRequest<StudioPortfolioForecastSnapshot>(
    "/api/portfolio/forecast",
    { signal },
  );
  if (!response.data?.portfolioId || !Array.isArray(response.data.trends)) {
    throw new Error("Portfolio Forecast Intelligence was not returned.");
  }
  return response.data;
}

export async function previewStudioPortfolioForecastDraft() {
  const response = await apiRequest<StudioPortfolioForecastPreview>(
    "/api/portfolio/forecast/preview",
    { method: "POST" },
  );
  if (!response.data?.preview?.portfolioId) {
    throw new Error("Portfolio Forecast preview was not returned.");
  }
  return response.data;
}

export async function confirmStudioPortfolioForecastDraft() {
  const response = await apiRequest<Readonly<{
    forecast: StudioPortfolioForecastSnapshot;
    action: StudioPortfolioForecastPreview["action"];
    draft: StudioPortfolioForecastDraft;
  }>>(
    "/api/portfolio/forecast/confirm",
    { method: "POST", body: JSON.stringify({ confirm: true }) },
  );
  if (!response.data?.draft?.draftId) {
    throw new Error("Portfolio Forecast Draft was not returned.");
  }
  return response.data;
}

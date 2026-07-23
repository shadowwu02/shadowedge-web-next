import { apiRequest } from "@/lib/api";
import type { StudioPortfolioIntelligence } from "@/features/studio/capabilities/studioPortfolioIntelligence";

export async function getStudioPortfolioIntelligence() {
  const envelope = await apiRequest<StudioPortfolioIntelligence>("/api/portfolio/intelligence");
  if (!envelope.data?.portfolio?.portfolioId || !Array.isArray(envelope.data.relations) || !Array.isArray(envelope.data.insights)) throw new Error("Portfolio Intelligence was not returned.");
  return envelope.data;
}

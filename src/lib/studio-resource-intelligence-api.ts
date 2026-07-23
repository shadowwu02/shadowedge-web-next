import { apiRequest } from "@/lib/api";
import type { StudioResourceIntelligence } from "@/features/studio/capabilities/studioResourceIntelligence";

export async function getStudioResourceIntelligence() {
  const envelope = await apiRequest<StudioResourceIntelligence>("/api/portfolio/resources");
  if (!envelope.data?.portfolioId || !Array.isArray(envelope.data.assets) || !Array.isArray(envelope.data.insights)) throw new Error("Resource Intelligence was not returned.");
  return envelope.data;
}

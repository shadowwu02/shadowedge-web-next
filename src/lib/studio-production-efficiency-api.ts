import { apiRequest } from "@/lib/api";
import type { StudioProductionEfficiency } from "@/features/studio/capabilities/studioProductionEfficiency";

export async function getStudioProductionEfficiency() {
  const envelope = await apiRequest<StudioProductionEfficiency>("/api/portfolio/efficiency");
  if (!envelope.data?.portfolioId || !Array.isArray(envelope.data.records) || !Array.isArray(envelope.data.insights)) throw new Error("Production Efficiency was not returned.");
  return envelope.data;
}

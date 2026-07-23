import type { StudioScenarioSimulationBundle } from "@/features/studio/capabilities/studioScenarioSimulation";
import { apiRequest } from "@/lib/api";

export async function getStudioScenarioSimulation(projectId: string) {
  const envelope = await apiRequest<StudioScenarioSimulationBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/scenarios`,
  );
  if (!Array.isArray(envelope.data?.scenarios)) throw new Error("Scenario simulations were not returned.");
  return envelope.data;
}

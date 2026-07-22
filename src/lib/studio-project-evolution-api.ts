import { apiRequest } from "@/lib/api";
import type { StudioProjectEvolutionBundle } from "@/features/studio/capabilities/studioProjectEvolution";

export async function getStudioProjectEvolution(projectId: string) {
  const envelope = await apiRequest<StudioProjectEvolutionBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/evolution`,
  );
  if (!envelope.data?.projectId || !Array.isArray(envelope.data.timeline) || !Array.isArray(envelope.data.insights)) throw new Error("Project Evolution was not returned.");
  return envelope.data;
}

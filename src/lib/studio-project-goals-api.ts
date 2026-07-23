import { apiRequest } from "@/lib/api";
import type { StudioProjectGoalsBundle } from "@/features/studio/capabilities/studioProjectGoals";

export async function getStudioProjectGoals(projectId: string) {
  const envelope = await apiRequest<StudioProjectGoalsBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/goals`,
  );
  if (!envelope.data?.mission?.missionId || !Array.isArray(envelope.data.goals) || !Array.isArray(envelope.data.alignments)) throw new Error("Project Goals were not returned.");
  return envelope.data;
}

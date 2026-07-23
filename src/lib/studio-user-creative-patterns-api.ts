import { apiRequest } from "@/lib/api";
import type { StudioUserCreativePatterns } from "@/features/studio/capabilities/studioUserCreativeExperience";

export async function getStudioUserCreativePatterns(projectId: string) {
  const query = new URLSearchParams({ projectId });
  const envelope = await apiRequest<StudioUserCreativePatterns>(`/api/user/creative-patterns?${query.toString()}`);
  if (!Array.isArray(envelope.data?.experiences)) throw new Error("Creative Patterns were not returned.");
  return envelope.data;
}

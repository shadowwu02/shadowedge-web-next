import { apiRequest } from "@/lib/api";
import type { StudioCreativeQuality } from "@/features/studio/capabilities/studioCreativeQuality";

export async function getStudioCreativeQuality(projectId: string) {
  const envelope = await apiRequest<StudioCreativeQuality>(`/api/projects/${encodeURIComponent(projectId)}/quality`);
  if (envelope.data?.projectId !== projectId || !Array.isArray(envelope.data.evaluations) || !Array.isArray(envelope.data.issues)) throw new Error("Creative Quality was not returned.");
  return envelope.data;
}

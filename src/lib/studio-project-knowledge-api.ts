import { apiRequest } from "@/lib/api";
import type { StudioProjectKnowledgeGraph } from "@/features/studio/capabilities/studioProjectKnowledge";

export async function getStudioProjectKnowledge(projectId: string) {
  const envelope = await apiRequest<StudioProjectKnowledgeGraph>(
    `/api/projects/${encodeURIComponent(projectId)}/knowledge`,
  );
  if (!envelope.data?.projectId || !Array.isArray(envelope.data.nodes) || !Array.isArray(envelope.data.relationships)) throw new Error("Project Knowledge was not returned.");
  return envelope.data;
}

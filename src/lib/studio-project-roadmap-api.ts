import type {
  StudioProjectRoadmap,
  StudioProjectRoadmapDraft,
  StudioProjectRoadmapPreview,
} from "@/features/studio/capabilities/studioProjectRoadmap";
import { apiRequest } from "@/lib/api";

export async function getStudioProjectRoadmap(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioProjectRoadmap>(
    `/api/projects/${encodeURIComponent(projectId)}/roadmap`,
    { signal },
  );
  if (!response.data?.roadmapId) throw new Error("Project Roadmap was not returned.");
  return response.data;
}

export async function previewStudioProjectRoadmap(projectId: string) {
  const response = await apiRequest<StudioProjectRoadmapPreview>(
    `/api/projects/${encodeURIComponent(projectId)}/roadmap/preview`,
    { method: "POST" },
  );
  if (!response.data?.preview?.roadmapId) throw new Error("Project Roadmap preview was not returned.");
  return response.data;
}

export async function confirmStudioProjectRoadmap(projectId: string) {
  const response = await apiRequest<Readonly<{
    roadmap: StudioProjectRoadmap;
    action: StudioProjectRoadmapPreview["action"];
    draft: StudioProjectRoadmapDraft;
  }>>(
    `/api/projects/${encodeURIComponent(projectId)}/roadmap/confirm`,
    { method: "POST", body: JSON.stringify({ confirm: true }) },
  );
  if (!response.data?.draft?.draftId) throw new Error("Project Roadmap Draft was not returned.");
  return response.data;
}

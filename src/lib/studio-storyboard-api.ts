import type {
  StudioSceneShots,
  StudioShotDraft,
  StudioStoryboardBundle,
} from "@/features/studio/capabilities/studioStoryboard";
import { apiRequest } from "@/lib/api";

export async function getStudioStoryboards(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioStoryboardBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/storyboards`,
    { signal },
  );
  if (!response.data?.projectId || !Array.isArray(response.data.storyboards)) {
    throw new Error("Creative Storyboards were not returned.");
  }
  return response.data;
}

export async function getStudioSceneShots(sceneId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioSceneShots>(
    `/api/scenes/${encodeURIComponent(sceneId)}/shots`,
    { signal },
  );
  if (!response.data?.sceneId || !Array.isArray(response.data.shots)) {
    throw new Error("Creative Shots were not returned.");
  }
  return response.data;
}

export async function previewStudioShotDraft(sceneId: string, shotId: string) {
  const response = await apiRequest<{ draft: StudioShotDraft; boundary: "PREVIEW_ONLY" }>(
    `/api/scenes/${encodeURIComponent(sceneId)}/shots/${encodeURIComponent(shotId)}/draft/preview`,
    { method: "POST", body: JSON.stringify({ reason: "Review this Storyboard shot as a Prompt Draft." }) },
  );
  if (!response.data?.draft?.draftId || response.data.draft.status !== "PREVIEWED") {
    throw new Error("Shot Draft Preview was not returned.");
  }
  return response.data;
}

export async function confirmStudioShotDraft(sceneId: string, shotId: string, draftId: string) {
  const response = await apiRequest<{ draft: StudioShotDraft; boundary: "DRAFT_CREATED_NO_TIMELINE_MUTATION" }>(
    `/api/scenes/${encodeURIComponent(sceneId)}/shots/${encodeURIComponent(shotId)}/draft/confirm`,
    { method: "POST", body: JSON.stringify({ draftId, confirm: true }) },
  );
  if (!response.data?.draft?.draftId || response.data.draft.status !== "CONFIRMED") {
    throw new Error("Confirmed Shot Draft was not returned.");
  }
  return response.data;
}

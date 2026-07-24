import type {
  StudioSceneShots,
  StudioShotBatchGenerationPlan,
  StudioShotGenerationDraft,
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

type StudioShotGenerationDraftResponse = Readonly<{
  draft: StudioShotGenerationDraft;
  actionType?: "SHOT_GENERATION_DRAFT";
  boundary: "PREVIEW_ONLY" | "VIDEO_WORKFLOW_DRAFT_ONLY";
}>;

export async function createStudioShotGenerationDraft(shotId: string) {
  const response = await apiRequest<StudioShotGenerationDraftResponse>(
    `/api/shots/${encodeURIComponent(shotId)}/generation-draft`,
    { method: "POST", body: JSON.stringify({}) },
  );
  if (!response.data?.draft?.draftId || !["PREVIEWED", "CONFIRMED"].includes(response.data.draft.status)) {
    throw new Error("Shot Generation Draft was not returned.");
  }
  return response.data;
}

export async function getStudioShotGenerationDraft(shotId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioShotGenerationDraftResponse>(
    `/api/shots/${encodeURIComponent(shotId)}/generation-draft`,
    { signal },
  );
  if (!response.data?.draft?.draftId) throw new Error("Shot Generation Draft was not returned.");
  return response.data;
}

export async function confirmStudioShotGenerationDraft(shotId: string, draftId: string) {
  const response = await apiRequest<StudioShotGenerationDraftResponse>(
    `/api/shots/${encodeURIComponent(shotId)}/generation-draft`,
    { method: "POST", body: JSON.stringify({ draftId, confirm: true }) },
  );
  if (!response.data?.draft?.draftId || response.data.draft.status !== "CONFIRMED") {
    throw new Error("Confirmed Shot Generation Draft was not returned.");
  }
  return response.data;
}

type StudioShotBatchGenerationPlanResponse = Readonly<{
  plan: StudioShotBatchGenerationPlan;
  actionType?: "BATCH_GENERATION_PLAN_DRAFT";
  boundary: "PREVIEW_ONLY" | "BATCH_DRAFT_CONFIRMED_NO_QUEUE";
}>;

export async function createStudioShotBatchGenerationPlan(sceneId: string) {
  const response = await apiRequest<StudioShotBatchGenerationPlanResponse>(
    `/api/scenes/${encodeURIComponent(sceneId)}/batch-generation-plan`,
    { method: "POST", body: JSON.stringify({ dependencyMode: "INDEPENDENT" }) },
  );
  if (!response.data?.plan?.batchPlanId) throw new Error("Batch Generation Plan was not returned.");
  return response.data;
}

export async function getStudioShotBatchGenerationPlan(sceneId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioShotBatchGenerationPlanResponse>(
    `/api/scenes/${encodeURIComponent(sceneId)}/batch-generation-plan`,
    { signal },
  );
  if (!response.data?.plan?.batchPlanId) throw new Error("Batch Generation Plan was not returned.");
  return response.data;
}

export async function confirmStudioShotBatchGenerationPlan(sceneId: string, batchPlanId: string) {
  const response = await apiRequest<StudioShotBatchGenerationPlanResponse>(
    `/api/scenes/${encodeURIComponent(sceneId)}/batch-generation-plan`,
    { method: "POST", body: JSON.stringify({ batchPlanId, confirm: true }) },
  );
  if (!response.data?.plan?.batchPlanId || response.data.plan.status !== "CONFIRMED") {
    throw new Error("Confirmed Batch Generation Plan was not returned.");
  }
  return response.data;
}

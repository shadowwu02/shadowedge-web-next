import {
  STUDIO_CREATIVE_CANVAS_EDIT_STATUSES,
  type StudioCreativeCanvasEditStatus,
} from "@/features/studio/capabilities/studioCreativeCanvas";

export const STUDIO_CREATIVE_CANVAS_ACTIVE_DRAFTS_STORAGE_KEY =
  "shadowedge_studio_creative_canvas_active_drafts_v1";

export const STUDIO_CREATIVE_CANVAS_DRAFT_TYPES = [
  "EDIT_SESSION",
  "AI_PLAN",
  "AI_OPTIMIZATION",
] as const;

export type StudioCreativeCanvasDraftType =
  typeof STUDIO_CREATIVE_CANVAS_DRAFT_TYPES[number];

export type StudioCreativeCanvasActiveDraft = Readonly<{
  draftId: string;
  projectId: string;
  graphVersion: string;
  status: StudioCreativeCanvasEditStatus;
  createdAt: string;
  draftType: StudioCreativeCanvasDraftType;
  editSessionId: string;
}>;

type ActiveDraftIndex = Record<string, StudioCreativeCanvasActiveDraft>;

function storage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function isActiveDraft(value: unknown, projectId?: string): value is StudioCreativeCanvasActiveDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.draftId === "string" &&
    Boolean(record.draftId.trim()) &&
    typeof record.projectId === "string" &&
    Boolean(record.projectId.trim()) &&
    (!projectId || record.projectId === projectId) &&
    typeof record.graphVersion === "string" &&
    Boolean(record.graphVersion.trim()) &&
    typeof record.createdAt === "string" &&
    Boolean(record.createdAt.trim()) &&
    typeof record.editSessionId === "string" &&
    Boolean(record.editSessionId.trim()) &&
    STUDIO_CREATIVE_CANVAS_DRAFT_TYPES.includes(
      record.draftType as StudioCreativeCanvasDraftType,
    ) &&
    STUDIO_CREATIVE_CANVAS_EDIT_STATUSES.includes(
      record.status as StudioCreativeCanvasEditStatus,
    )
  );
}

function readIndex(): ActiveDraftIndex {
  const target = storage();
  if (!target) return {};
  try {
    const parsed = JSON.parse(
      target.getItem(STUDIO_CREATIVE_CANVAS_ACTIVE_DRAFTS_STORAGE_KEY) || "{}",
    ) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([projectId, value]) => isActiveDraft(value, projectId)),
    );
  } catch {
    return {};
  }
}

function writeIndex(index: ActiveDraftIndex) {
  const target = storage();
  if (!target) return false;
  try {
    target.setItem(
      STUDIO_CREATIVE_CANVAS_ACTIVE_DRAFTS_STORAGE_KEY,
      JSON.stringify(index),
    );
    return true;
  } catch {
    return false;
  }
}

export function getActiveStudioCreativeCanvasDraft(projectId: string) {
  const value = readIndex()[projectId];
  return isActiveDraft(value, projectId) ? value : null;
}

export function saveActiveStudioCreativeCanvasDraft(
  value: StudioCreativeCanvasActiveDraft,
) {
  if (!isActiveDraft(value, value.projectId)) return false;
  return writeIndex({
    ...readIndex(),
    [value.projectId]: value,
  });
}

export function clearActiveStudioCreativeCanvasDraft(projectId: string) {
  const index = readIndex();
  if (!index[projectId]) return true;
  delete index[projectId];
  return writeIndex(index);
}

import { mergeMediaAssets, normalizeMediaAsset } from "@/lib/media-assets";
import { isRemoteMediaUrl, isTransientMediaUrl } from "@/lib/upload-rules";
import {
  parseMentionBindings,
  reconcileMentionBindings,
  serializeMentionBindings,
  type VideoMentionBinding,
} from "@/lib/video/videoMentionBindings";
import type { UploadMediaItem, UploadMediaRole, UploadMediaSource, UploadMediaType } from "@/types/video";

export const VIDEO_WORKSPACE_DRAFT_KEY = "shadowedge_video_create_draft_v1";
export const VIDEO_WORKSPACE_DRAFT_VERSION = 1;

export type VideoDraftParams = {
  duration?: number;
  ratio?: string;
  quality?: string;
  generateAudio?: boolean;
};

export type VideoWorkspaceDraft = {
  version: typeof VIDEO_WORKSPACE_DRAFT_VERSION;
  prompt: string;
  modelId: string;
  providerModel?: string;
  modelLabel?: string;
  params: VideoDraftParams;
  referenceMedia: UploadMediaItem[];
  mentionBindings: VideoMentionBinding[];
  updatedAt: number;
};

type RawDraft = Partial<VideoWorkspaceDraft> &
  Record<string, unknown> & {
    assets?: unknown;
    duration?: unknown;
    ratio?: unknown;
    quality?: unknown;
    generateAudio?: unknown;
  };

type DraftWriteInput = {
  prompt: string;
  modelId: string;
  providerModel?: string;
  modelLabel?: string;
  params: VideoDraftParams;
  referenceMedia: UploadMediaItem[];
  mentionBindings?: VideoMentionBinding[];
};

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function pickString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}

function parseDuration(value: unknown) {
  const duration = Number(String(value || "").replace("s", "").trim());
  return Number.isFinite(duration) && duration > 0 ? duration : undefined;
}

function inferRoleFromSlot(slot: string, value: unknown): UploadMediaRole {
  const rawRole = String((value as { role?: unknown })?.role || "").trim();
  if (rawRole === "start_frame" || rawRole === "end_frame" || rawRole === "reference") return rawRole;

  const slotName = slot.toLowerCase();
  if (slotName.includes("start") || slotName.includes("first")) return "start_frame";
  if (slotName.includes("end") || slotName.includes("last")) return "end_frame";
  return "reference";
}

function inferTypeFromSlot(slot: string, value: unknown): UploadMediaType | undefined {
  const rawType = String((value as { type?: unknown })?.type || "").toLowerCase();
  if (rawType === "image" || rawType === "video" || rawType === "audio") return rawType;

  const slotName = slot.toLowerCase();
  if (slotName.includes("audio")) return "audio";
  if (slotName.includes("video") || slotName.includes("clip")) return "video";
  if (slotName) return "image";
  return undefined;
}

function rawAssetToMedia(value: unknown, slot = "media") {
  const rawValue = typeof value === "string" ? { url: value } : value;
  const type = inferTypeFromSlot(slot, rawValue);
  const normalized = normalizeMediaAsset(
    {
      ...(typeof rawValue === "object" && rawValue ? rawValue : {}),
      type,
    },
    "reference_selected",
  );

  if (!normalized) return null;

  return {
    ...normalized,
    role: inferRoleFromSlot(slot, rawValue),
    source: "reference_selected" as UploadMediaSource,
  };
}

function flattenLegacyAssets(assets: unknown) {
  if (!assets || typeof assets !== "object") return [];
  const media: UploadMediaItem[] = [];

  Object.entries(assets as Record<string, unknown>).forEach(([slot, value]) => {
    const values = Array.isArray(value) ? value : value ? [value] : [];
    values.forEach((item) => {
      const normalized = rawAssetToMedia(item, slot);
      if (normalized) media.push(normalized);
    });
  });

  return media;
}

export function sanitizeVideoDraftMedia(items: UploadMediaItem[]) {
  const readyRemoteItems = items
    .filter((item) => item.uploadStatus === "ready" && item.url && isRemoteMediaUrl(item.url) && !isTransientMediaUrl(item.url))
    .map((item) => {
      const previewUrl = item.previewUrl && !isTransientMediaUrl(item.previewUrl) ? item.previewUrl : "";

      return {
        id: item.id || item.url || `${item.type}-${item.name}`,
        type: item.type,
        role: item.role || ("reference" as UploadMediaRole),
        source: item.source || ("reference_selected" as UploadMediaSource),
        name: item.name || `${item.type} reference`,
        previewUrl: previewUrl || (item.type === "image" ? item.url : ""),
        url: item.url,
        size: item.size,
        mimeType: item.mimeType,
        filename: item.filename,
        originalName: item.originalName,
        duration: item.duration,
        uploadStatus: "ready" as const,
      };
    });

  return mergeMediaAssets(readyRemoteItems);
}

function normalizeDraft(raw: RawDraft): VideoWorkspaceDraft | null {
  if (raw.version !== undefined && raw.version !== VIDEO_WORKSPACE_DRAFT_VERSION) return null;

  const rawParams = (raw.params && typeof raw.params === "object" ? raw.params : {}) as VideoDraftParams;
  const referenceMedia = Array.isArray(raw.referenceMedia)
    ? sanitizeVideoDraftMedia(raw.referenceMedia)
    : sanitizeVideoDraftMedia(flattenLegacyAssets(raw.assets));
  const mentionBindings = serializeMentionBindings(reconcileMentionBindings(parseMentionBindings(raw.mentionBindings), referenceMedia));

  return {
    version: VIDEO_WORKSPACE_DRAFT_VERSION,
    prompt: typeof raw.prompt === "string" ? raw.prompt : "",
    modelId: pickString(raw.modelId) || "",
    providerModel: pickString(raw.providerModel),
    modelLabel: pickString(raw.modelLabel),
    params: {
      duration: parseDuration(rawParams.duration ?? raw.duration),
      ratio: pickString(rawParams.ratio, raw.ratio),
      quality: pickString(rawParams.quality, raw.quality),
      generateAudio:
        typeof rawParams.generateAudio === "boolean"
          ? rawParams.generateAudio
          : typeof raw.generateAudio === "boolean"
            ? raw.generateAudio
            : undefined,
    },
    referenceMedia,
    mentionBindings,
    updatedAt: Number(raw.updatedAt || 0) || 0,
  };
}

export function readVideoDraft() {
  const storage = safeLocalStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(VIDEO_WORKSPACE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RawDraft;
    return parsed && typeof parsed === "object" ? normalizeDraft(parsed) : null;
  } catch {
    return null;
  }
}

export function saveVideoDraft(input: DraftWriteInput) {
  const storage = safeLocalStorage();
  const draft: VideoWorkspaceDraft = {
    version: VIDEO_WORKSPACE_DRAFT_VERSION,
    prompt: input.prompt,
    modelId: input.modelId,
    providerModel: input.providerModel,
    modelLabel: input.modelLabel,
    params: input.params,
    referenceMedia: sanitizeVideoDraftMedia(input.referenceMedia),
    mentionBindings: serializeMentionBindings(input.mentionBindings || []),
    updatedAt: Date.now(),
  };

  if (!storage) return draft;

  try {
    storage.setItem(VIDEO_WORKSPACE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    try {
      storage.setItem(
        VIDEO_WORKSPACE_DRAFT_KEY,
        JSON.stringify({
          ...draft,
          referenceMedia: draft.referenceMedia.slice(0, 40),
        }),
      );
    } catch {
      // Ignore localStorage quota failures; the workspace should remain usable.
    }
  }

  return draft;
}

export function clearVideoDraft() {
  const storage = safeLocalStorage();
  if (!storage) return;

  try {
    storage.removeItem(VIDEO_WORKSPACE_DRAFT_KEY);
  } catch {
    // Ignore storage access failures.
  }
}

import type {
  RemakeKeyframe,
  RemakeMode,
  RemakeSegment,
  RemakeSettings,
  RemakeShot,
  RemakeSourceVideo,
  RemakeSourceVideoMetadata,
  RemakeStoryboard,
  RemakeTargetRegion,
} from "@/components/video/remake/remakeTypes";

export const REMAKE_STORYBOARD_DRAFT_KEY = "shadowedge_video_remake_storyboard_draft_v1";
export const REMAKE_STORYBOARD_DRAFT_VERSION = 1;
export const REMAKE_STORYBOARD_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const REMAKE_MODES = new Set<RemakeMode>(["single_clip", "full_film"]);
const REMAKE_TARGET_REGIONS = new Set<RemakeTargetRegion>(["US", "Middle East", "Japan", "Southeast Asia"]);
const SENSITIVE_URL_PARAMS = ["access_token", "refresh_token", "token", "api_key", "apikey", "authorization", "session", "cookie"];

export type RemakeStoryboardDraft = {
  version: typeof REMAKE_STORYBOARD_DRAFT_VERSION;
  analysisId: string;
  storyboard: RemakeStoryboard;
  segments: RemakeSegment[];
  sourceVideo?: RemakeSourceVideoMetadata;
  sourceVideoUrl?: string;
  sourceVideoName?: string;
  sourceVideoType?: string;
  sourceVideoSize?: number;
  sourceVideoLastModified?: number;
  sourceVideoDuration?: number;
  settings: RemakeSettings;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

export type ReadRemakeStoryboardDraftResult = {
  draft: RemakeStoryboardDraft | null;
  status: "ok" | "missing" | "expired" | "invalid" | "unavailable";
};

type SaveRemakeStoryboardDraftInput = {
  segments?: RemakeSegment[];
  settings: RemakeSettings;
  sourceVideo?: RemakeSourceVideo | null;
  sourceVideoMetadata?: RemakeSourceVideoMetadata;
  sourceVideoUrl?: string;
  storyboard: RemakeStoryboard;
};

type RawRecord = Record<string, unknown>;

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {};
}

function pickString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}

function pickNumber(...values: unknown[]) {
  const value = values.find((item) => Number.isFinite(Number(item)));
  return value === undefined ? undefined : Number(value);
}

function pickBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeStoredUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const lower = raw.toLowerCase();
  if (lower.startsWith("data:") || lower.startsWith("blob:") || lower.includes("base64,")) return "";

  if (raw.startsWith("/uploads/")) return raw;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    SENSITIVE_URL_PARAMS.forEach((param) => url.searchParams.delete(param));
    return url.toString();
  } catch {
    return "";
  }
}

function sanitizeKeyframe(value: unknown): RemakeKeyframe | null {
  const raw = asRecord(value);
  const url = sanitizeStoredUrl(raw.url);
  const time = pickNumber(raw.time);

  if (!url || time === undefined) return null;

  return {
    height: pickNumber(raw.height),
    time,
    url,
    width: pickNumber(raw.width),
    ...(pickString(raw.segmentId, raw.segment_id) ? { segmentId: pickString(raw.segmentId, raw.segment_id) } : {}),
  } as RemakeKeyframe;
}

function sanitizeKeyframes(value: unknown) {
  return Array.isArray(value) ? value.map(sanitizeKeyframe).filter((item): item is RemakeKeyframe => Boolean(item)) : [];
}

function sanitizeReferenceHints(value: unknown): RemakeShot["referenceHints"] {
  const raw = asRecord(value);
  const toStrings = (item: unknown) => (Array.isArray(item) ? item.map(String).filter(Boolean) : []);

  return {
    audios: toStrings(raw.audios),
    characters: toStrings(raw.characters),
    images: toStrings(raw.images),
    videos: toStrings(raw.videos),
  };
}

function sanitizeGenerationParams(value: unknown): RemakeShot["generationParams"] {
  const raw = asRecord(value);

  return {
    duration: pickNumber(raw.duration) || 5,
    modelId: pickString(raw.modelId) || "seedance_2_0",
    quality: pickString(raw.quality) || "720p",
    ratio: pickString(raw.ratio) || "16:9",
  };
}

function sanitizeShot(value: unknown): RemakeShot | null {
  const raw = asRecord(value);
  const sourceTimeRange = asRecord(raw.sourceTimeRange);
  const shotGroupId = pickString(raw.shotGroupId);
  const shotNumber = pickNumber(raw.shot);

  if (!shotGroupId || shotNumber === undefined) return null;

  return {
    action: pickString(raw.action) || "",
    audio: pickString(raw.audio) || "",
    camera: pickString(raw.camera) || "",
    dialogue: pickString(raw.dialogue) || "",
    duration: pickNumber(raw.duration) || 5,
    emotion: pickString(raw.emotion) || "",
    generationParams: sanitizeGenerationParams(raw.generationParams),
    keyframes: sanitizeKeyframes(raw.keyframes),
    motion: pickString(raw.motion) || "",
    position: pickString(raw.position) || "",
    prompt: pickString(raw.prompt) || "",
    referenceHints: sanitizeReferenceHints(raw.referenceHints),
    shot: shotNumber,
    shotGroupId,
    sourceTimeRange: {
      end: pickNumber(sourceTimeRange.end) || 0,
      start: pickNumber(sourceTimeRange.start) || 0,
    },
  };
}

function sanitizeSettings(value: unknown, fallback?: RemakeSettings): RemakeSettings {
  const raw = asRecord(value);
  const mode = pickString(raw.mode);
  const targetRegion = pickString(raw.targetRegion);

  return {
    characterRules: pickString(raw.characterRules) ?? fallback?.characterRules ?? "",
    mode: mode && REMAKE_MODES.has(mode as RemakeMode) ? (mode as RemakeMode) : fallback?.mode ?? "single_clip",
    sceneStyle: pickString(raw.sceneStyle) ?? fallback?.sceneStyle ?? "",
    targetRegion:
      targetRegion && REMAKE_TARGET_REGIONS.has(targetRegion as RemakeTargetRegion)
        ? (targetRegion as RemakeTargetRegion)
        : fallback?.targetRegion ?? "US",
    translateDialogue: pickBoolean(raw.translateDialogue, fallback?.translateDialogue ?? true),
  };
}

function sanitizeStoryboard(value: unknown): RemakeStoryboard | null {
  const raw = asRecord(value);
  const id = pickString(raw.id);
  const shots = Array.isArray(raw.shots) ? raw.shots.map(sanitizeShot).filter((shot): shot is RemakeShot => Boolean(shot)) : [];

  if (!id || !shots.length) return null;

  const settings = sanitizeSettings(raw);

  return {
    characterRules: settings.characterRules,
    id,
    mode: settings.mode,
    sceneStyle: settings.sceneStyle,
    shots,
    sourceTitle: pickString(raw.sourceTitle),
    targetRegion: settings.targetRegion,
    translateDialogue: settings.translateDialogue,
  };
}

function sanitizeSegment(value: unknown): RemakeSegment | null {
  const raw = asRecord(value);
  const id = pickString(raw.id);
  if (!id) return null;

  return {
    duration: pickNumber(raw.duration) || 0,
    end: pickNumber(raw.end) || 0,
    id,
    keyframes: sanitizeKeyframes(raw.keyframes),
    start: pickNumber(raw.start) || 0,
  };
}

function sanitizeSourceVideoMetadata(value: unknown): RemakeSourceVideoMetadata | undefined {
  const raw = asRecord(value);
  const duration = pickNumber(raw.duration);
  if (duration === undefined) return undefined;

  return {
    codec: pickString(raw.codec),
    duration,
    fps: pickNumber(raw.fps),
    height: pickNumber(raw.height),
    width: pickNumber(raw.width),
  };
}

function removeStoredDraft(storage: Storage | null) {
  if (!storage) return;
  try {
    storage.removeItem(REMAKE_STORYBOARD_DRAFT_KEY);
  } catch {
    // Ignore storage access failures.
  }
}

function normalizeDraft(raw: unknown): RemakeStoryboardDraft | null {
  const record = asRecord(raw);
  if (record.version !== REMAKE_STORYBOARD_DRAFT_VERSION) return null;

  const storyboard = sanitizeStoryboard(record.storyboard);
  if (!storyboard) return null;

  const settings = sanitizeSettings(record.settings, {
    characterRules: storyboard.characterRules,
    mode: storyboard.mode,
    sceneStyle: storyboard.sceneStyle,
    targetRegion: storyboard.targetRegion,
    translateDialogue: storyboard.translateDialogue,
  });
  const updatedStoryboard: RemakeStoryboard = {
    ...storyboard,
    ...settings,
  };
  const createdAt = pickNumber(record.createdAt) || Date.now();
  const updatedAt = pickNumber(record.updatedAt) || createdAt;
  const expiresAt = pickNumber(record.expiresAt) || updatedAt + REMAKE_STORYBOARD_DRAFT_TTL_MS;

  return {
    analysisId: pickString(record.analysisId) || updatedStoryboard.id,
    createdAt,
    expiresAt,
    segments: Array.isArray(record.segments)
      ? record.segments.map(sanitizeSegment).filter((segment): segment is RemakeSegment => Boolean(segment))
      : [],
    settings,
    sourceVideo: sanitizeSourceVideoMetadata(record.sourceVideo),
    sourceVideoDuration: pickNumber(record.sourceVideoDuration),
    sourceVideoLastModified: pickNumber(record.sourceVideoLastModified),
    sourceVideoName: pickString(record.sourceVideoName),
    sourceVideoSize: pickNumber(record.sourceVideoSize),
    sourceVideoType: pickString(record.sourceVideoType),
    sourceVideoUrl: sanitizeStoredUrl(record.sourceVideoUrl),
    storyboard: updatedStoryboard,
    updatedAt,
    version: REMAKE_STORYBOARD_DRAFT_VERSION,
  };
}

export function readRemakeStoryboardDraft(): ReadRemakeStoryboardDraftResult {
  const storage = safeLocalStorage();
  if (!storage) return { draft: null, status: "unavailable" };

  try {
    const raw = storage.getItem(REMAKE_STORYBOARD_DRAFT_KEY);
    if (!raw) return { draft: null, status: "missing" };

    const draft = normalizeDraft(JSON.parse(raw));
    if (!draft) {
      removeStoredDraft(storage);
      return { draft: null, status: "invalid" };
    }

    if (draft.expiresAt <= Date.now()) {
      removeStoredDraft(storage);
      return { draft: null, status: "expired" };
    }

    return { draft, status: "ok" };
  } catch {
    removeStoredDraft(storage);
    return { draft: null, status: "invalid" };
  }
}

export function saveRemakeStoryboardDraft(input: SaveRemakeStoryboardDraftInput) {
  const storage = safeLocalStorage();
  const now = Date.now();
  const storyboard = sanitizeStoryboard(input.storyboard);

  if (!storyboard) return { draft: null, ok: false };

  const settings = sanitizeSettings(input.settings, {
    characterRules: storyboard.characterRules,
    mode: storyboard.mode,
    sceneStyle: storyboard.sceneStyle,
    targetRegion: storyboard.targetRegion,
    translateDialogue: storyboard.translateDialogue,
  });
  const sourceVideoUrl = sanitizeStoredUrl(input.sourceVideoUrl || input.sourceVideo?.url);
  const draft: RemakeStoryboardDraft = {
    analysisId: storyboard.id,
    createdAt: now,
    expiresAt: now + REMAKE_STORYBOARD_DRAFT_TTL_MS,
    segments: (input.segments || []).map(sanitizeSegment).filter((segment): segment is RemakeSegment => Boolean(segment)),
    settings,
    sourceVideo: sanitizeSourceVideoMetadata(input.sourceVideoMetadata),
    sourceVideoDuration: input.sourceVideo?.duration,
    sourceVideoLastModified: input.sourceVideo?.lastModified,
    sourceVideoName: input.sourceVideo?.name || storyboard.sourceTitle || "",
    sourceVideoSize: input.sourceVideo?.size,
    sourceVideoType: input.sourceVideo?.type,
    sourceVideoUrl,
    storyboard: {
      ...storyboard,
      ...settings,
    },
    updatedAt: now,
    version: REMAKE_STORYBOARD_DRAFT_VERSION,
  };

  if (!storage) return { draft, ok: false };

  try {
    storage.setItem(REMAKE_STORYBOARD_DRAFT_KEY, JSON.stringify(draft));
    return { draft, ok: true };
  } catch {
    return { draft, ok: false };
  }
}

export function clearRemakeStoryboardDraft() {
  removeStoredDraft(safeLocalStorage());
}

export function getRemakeSourceVideoFromDraft(draft: RemakeStoryboardDraft): RemakeSourceVideo | null {
  if (!draft.sourceVideoUrl && !draft.sourceVideoName) return null;

  return {
    duration: draft.sourceVideoDuration || draft.sourceVideo?.duration,
    lastModified: draft.sourceVideoLastModified || draft.updatedAt,
    name: draft.sourceVideoName || draft.storyboard.sourceTitle || "Restored source video",
    size: draft.sourceVideoSize || 0,
    type: draft.sourceVideoType || "video/mp4",
    url: draft.sourceVideoUrl,
  };
}

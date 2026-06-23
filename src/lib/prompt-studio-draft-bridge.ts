"use client";

export const PROMPT_STUDIO_TO_VIDEO_DRAFT_KEY = "shadowedge_prompt_studio_to_video_draft_v1";
export const PROMPT_STUDIO_TO_IMAGE_DRAFT_KEY = "shadowedge_prompt_studio_to_image_draft_v1";
export const WORKSPACE_TO_PROMPT_STUDIO_DRAFT_KEY = "shadowedge_workspace_to_prompt_studio_v1";
export const PROMPT_STUDIO_RETURN_STATE_KEY = "shadowedge_prompt_studio_return_state_v1";
const LANGUAGE_STORAGE_KEY = "se_lang";
const PROMPT_STUDIO_RETURN_STATE_TTL_MS = 30 * 60 * 1000;

export type PromptStudioDraftTarget = "video" | "image" | "storyboard";

export type PromptStudioDraftReferenceImage = {
  id: string;
  name: string;
  url: string;
  storagePath?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  uploadedAt?: string;
  provider?: string;
};

export type PromptStudioBridgeDraft = {
  prompt: string;
  source: "prompt-studio" | "video-workspace" | "image-workspace";
  mode?: string;
  target?: PromptStudioDraftTarget;
  engine?: string;
  referenceImages?: PromptStudioDraftReferenceImage[];
  createdAt: string;
};

export type PromptStudioReturnState = {
  source: "asset-reference";
  projectId?: string;
  assetType?: "characters" | "locations" | "props";
  assetTag?: string;
  assetName?: string;
  mode: "project";
  openHistory: boolean;
  openProjectDetail: boolean;
  createdAt: string;
};

type DraftInput = Omit<PromptStudioBridgeDraft, "createdAt"> & {
  createdAt?: string;
};

type ReturnStateInput = Omit<PromptStudioReturnState, "createdAt"> & {
  createdAt?: string;
};

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getPromptStudioDraftLocale(currentLocale?: string) {
  const storage = safeLocalStorage();
  try {
    const stored = storage?.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {
    // Keep the current locale if language storage is unavailable.
  }

  return currentLocale === "zh" ? "zh" : "en";
}

function normalizePrompt(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUnsafeReferenceImageUrl(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized) return false;
  if (normalized.startsWith("data:") || normalized.startsWith("blob:") || normalized.startsWith("javascript:")) return true;
  return (
    normalized.includes("127.0.0.1") ||
    normalized.includes("localhost") ||
    normalized.includes("0.0.0.0") ||
    normalized.includes("[::1]") ||
    normalized.includes("file://")
  );
}

function normalizeReferenceImage(value: unknown): PromptStudioDraftReferenceImage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const reference = value as Record<string, unknown>;
  const url = typeof reference.url === "string" ? reference.url.trim() : "";
  const storagePath = typeof reference.storagePath === "string" ? reference.storagePath.trim() : "";
  if (!url || isUnsafeReferenceImageUrl(url) || isUnsafeReferenceImageUrl(storagePath)) return null;
  const fileName = typeof reference.fileName === "string" ? reference.fileName.trim().slice(0, 255) : "";
  const name = typeof reference.name === "string" && reference.name.trim() ? reference.name.trim() : fileName || "Reference image";
  const provider = typeof reference.provider === "string" ? reference.provider.trim().slice(0, 64) : "";

  return {
    id: typeof reference.id === "string" && reference.id.trim() ? reference.id.trim() : url,
    name,
    url,
    storagePath: storagePath || undefined,
    fileName: fileName || undefined,
    mimeType: typeof reference.mimeType === "string" ? reference.mimeType : undefined,
    sizeBytes: Number.isFinite(Number(reference.sizeBytes)) ? Number(reference.sizeBytes) : undefined,
    width: Number.isFinite(Number(reference.width)) ? Number(reference.width) : undefined,
    height: Number.isFinite(Number(reference.height)) ? Number(reference.height) : undefined,
    uploadedAt: typeof reference.uploadedAt === "string" ? reference.uploadedAt : undefined,
    provider: provider || undefined,
  };
}

function normalizeDraft(value: unknown): PromptStudioBridgeDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const prompt = normalizePrompt(record.prompt);
  if (!prompt) return null;

  const source = String(record.source || "");
  const target = String(record.target || "");
  const referenceImages: PromptStudioDraftReferenceImage[] | undefined = Array.isArray(record.referenceImages)
    ? record.referenceImages.reduce<PromptStudioDraftReferenceImage[]>((items, item) => {
        const normalized = normalizeReferenceImage(item);
        if (normalized) items.push(normalized);
        return items;
      }, []).slice(0, 10)
    : undefined;

  return {
    prompt,
    source:
      source === "video-workspace" || source === "image-workspace" || source === "prompt-studio"
        ? source
        : "prompt-studio",
    mode: typeof record.mode === "string" ? record.mode : undefined,
    target: target === "video" || target === "image" || target === "storyboard" ? target : undefined,
    engine: typeof record.engine === "string" ? record.engine : undefined,
    referenceImages,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
  };
}

function normalizeReturnState(value: unknown): PromptStudioReturnState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const source = String(record.source || "");
  const mode = String(record.mode || "");
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : "";
  const createdTime = Date.parse(createdAt);
  if (source !== "asset-reference" || mode !== "project" || !createdAt || !Number.isFinite(createdTime)) return null;
  if (createdTime + PROMPT_STUDIO_RETURN_STATE_TTL_MS <= Date.now()) return null;

  const assetType = String(record.assetType || "");
  const projectId = typeof record.projectId === "string" ? record.projectId.trim().slice(0, 128) : "";
  const assetTag = typeof record.assetTag === "string" ? record.assetTag.trim().slice(0, 128) : "";
  const assetName = typeof record.assetName === "string" ? record.assetName.trim().slice(0, 255) : "";

  return {
    source: "asset-reference",
    projectId: projectId || undefined,
    assetType: assetType === "characters" || assetType === "locations" || assetType === "props" ? assetType : undefined,
    assetTag: assetTag || undefined,
    assetName: assetName || undefined,
    mode: "project",
    openHistory: Boolean(record.openHistory),
    openProjectDetail: Boolean(record.openProjectDetail),
    createdAt,
  };
}

function readDraft(key: string) {
  const storage = safeLocalStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return normalizeDraft(JSON.parse(raw));
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage cleanup failures.
    }
    return null;
  }
}

function readReturnState() {
  const storage = safeLocalStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(PROMPT_STUDIO_RETURN_STATE_KEY);
    if (!raw) return null;
    const state = normalizeReturnState(JSON.parse(raw));
    if (!state) storage.removeItem(PROMPT_STUDIO_RETURN_STATE_KEY);
    return state;
  } catch {
    try {
      storage.removeItem(PROMPT_STUDIO_RETURN_STATE_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
    return null;
  }
}

function saveDraft(key: string, draft: DraftInput) {
  const storage = safeLocalStorage();
  const normalized = normalizeDraft({
    ...draft,
    createdAt: draft.createdAt || new Date().toISOString(),
  });
  if (!storage || !normalized) return false;

  try {
    storage.setItem(key, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function savePromptStudioReturnState(state: ReturnStateInput) {
  const storage = safeLocalStorage();
  const normalized = normalizeReturnState({
    ...state,
    createdAt: state.createdAt || new Date().toISOString(),
  });
  if (!storage || !normalized) return false;

  try {
    storage.setItem(PROMPT_STUDIO_RETURN_STATE_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function consumePromptStudioReturnState() {
  const storage = safeLocalStorage();
  const state = readReturnState();
  if (!storage) return state;

  try {
    storage.removeItem(PROMPT_STUDIO_RETURN_STATE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }

  return state;
}

function consumeDraft(key: string) {
  const storage = safeLocalStorage();
  const draft = readDraft(key);
  if (!storage) return draft;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }

  return draft;
}

export function savePromptStudioToVideoDraft(draft: DraftInput) {
  return saveDraft(PROMPT_STUDIO_TO_VIDEO_DRAFT_KEY, {
    ...draft,
    source: "prompt-studio",
    target: "video",
  });
}

export function savePromptStudioToImageDraft(draft: DraftInput) {
  return saveDraft(PROMPT_STUDIO_TO_IMAGE_DRAFT_KEY, {
    ...draft,
    source: "prompt-studio",
    target: "image",
  });
}

export function consumePromptStudioToVideoDraft() {
  return consumeDraft(PROMPT_STUDIO_TO_VIDEO_DRAFT_KEY);
}

export function consumePromptStudioToImageDraft() {
  return consumeDraft(PROMPT_STUDIO_TO_IMAGE_DRAFT_KEY);
}

export function saveWorkspaceToPromptStudioDraft(draft: DraftInput) {
  return saveDraft(WORKSPACE_TO_PROMPT_STUDIO_DRAFT_KEY, draft);
}

export function consumeWorkspaceToPromptStudioDraft() {
  return consumeDraft(WORKSPACE_TO_PROMPT_STUDIO_DRAFT_KEY);
}

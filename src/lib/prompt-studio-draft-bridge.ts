"use client";

export const PROMPT_STUDIO_TO_VIDEO_DRAFT_KEY = "shadowedge_prompt_studio_to_video_draft_v1";
export const PROMPT_STUDIO_TO_IMAGE_DRAFT_KEY = "shadowedge_prompt_studio_to_image_draft_v1";
export const WORKSPACE_TO_PROMPT_STUDIO_DRAFT_KEY = "shadowedge_workspace_to_prompt_studio_v1";
const LANGUAGE_STORAGE_KEY = "se_lang";

export type PromptStudioDraftTarget = "video" | "image" | "storyboard";

export type PromptStudioBridgeDraft = {
  prompt: string;
  source: "prompt-studio" | "video-workspace" | "image-workspace";
  mode?: string;
  target?: PromptStudioDraftTarget;
  engine?: string;
  createdAt: string;
};

type DraftInput = Omit<PromptStudioBridgeDraft, "createdAt"> & {
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

function normalizeDraft(value: unknown): PromptStudioBridgeDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const prompt = normalizePrompt(record.prompt);
  if (!prompt) return null;

  const source = String(record.source || "");
  const target = String(record.target || "");

  return {
    prompt,
    source:
      source === "video-workspace" || source === "image-workspace" || source === "prompt-studio"
        ? source
        : "prompt-studio",
    mode: typeof record.mode === "string" ? record.mode : undefined,
    target: target === "video" || target === "image" || target === "storyboard" ? target : undefined,
    engine: typeof record.engine === "string" ? record.engine : undefined,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
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

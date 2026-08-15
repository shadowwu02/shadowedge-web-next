import type { VideoModel } from "@/types/video";

export const VIDEO_PROMPT_FRONTEND_LIMIT = 4000;
export const VIDEO_PROMPT_FRONTEND_LIMIT_LABEL = "4,000";

export function getVideoPromptLimit(model?: VideoModel | null) {
  const value = Number(model?.maxPromptLength);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : VIDEO_PROMPT_FRONTEND_LIMIT;
}

export function getVideoPromptWarningThreshold(model?: VideoModel | null) {
  return Math.floor(getVideoPromptLimit(model) * 0.84);
}

export function countVideoPromptCharacters(value: string) {
  return Array.from(String(value || "")).length;
}

export function formatVideoPromptLimit(model?: VideoModel | null) {
  return getVideoPromptLimit(model).toLocaleString("en-US");
}

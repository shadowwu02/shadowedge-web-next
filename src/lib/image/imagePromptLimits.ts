import type { ImageModel } from "@/types/image";

export const IMAGE_PROMPT_FRONTEND_LIMIT = 4000;
export const IMAGE_PROMPT_FRONTEND_LIMIT_LABEL = "4,000";

export function getImagePromptLimit(model?: ImageModel | null) {
  const value = Number(model?.capabilities.maxPromptLength);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : IMAGE_PROMPT_FRONTEND_LIMIT;
}

export function getImagePromptWarningThreshold(model?: ImageModel | null) {
  return Math.floor(getImagePromptLimit(model) * 0.84);
}

export function countImagePromptCharacters(value: string) {
  return Array.from(String(value || "")).length;
}

export function formatImagePromptLimit(model?: ImageModel | null) {
  return getImagePromptLimit(model).toLocaleString("en-US");
}

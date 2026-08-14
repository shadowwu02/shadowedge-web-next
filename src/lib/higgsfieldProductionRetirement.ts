const retiredImageAliases = [
  "image_auto",
  "imagegen_2_0",
  "openai_hazel",
  "nano_banana_2",
  "nano_banana_flash",
  "seedream_v5_lite",
  "seedream_v4_5",
  "flux_2",
  "flux_kontext",
  "grok_image",
  "kling_omni_image",
  "z_image",
  "cinematic_studio_2_5",
  "marketing_studio_image",
  "text2image_soul_v2",
  "soul_cinematic",
  "soul_location",
] as const;

const retiredVideoAliases = [
  "cinematic_studio_3_0",
  "cinematic_studio_video",
  "cinematic_studio_video_v2",
  "veo3",
  "veo3_1",
  "veo3_1_lite",
  "grok_video",
  "kling2_6",
  "kling3_0",
  "marketing_studio_video",
  "minimax_hailuo",
  "seedance1_5",
  "soul_cast",
  "wan2_6",
  "wan2_7",
] as const;

function normalizeAlias(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const retiredImageSet = new Set<string>(retiredImageAliases.map(normalizeAlias));
const retiredVideoSet = new Set<string>(retiredVideoAliases.map(normalizeAlias));

export const HIGGSFIELD_PRODUCTION_RETIRED = true;
export const HIGGSFIELD_RETIRED_MODEL_MESSAGE =
  "This model is currently unavailable. Please select another model.";

export function isRetiredHiggsfieldImageAlias(value: unknown) {
  return retiredImageSet.has(normalizeAlias(value));
}

export function isRetiredHiggsfieldVideoAlias(value: unknown) {
  return retiredVideoSet.has(normalizeAlias(value));
}

export function isRetiredHiggsfieldModel(input: {
  id?: unknown;
  modelId?: unknown;
  name?: unknown;
  provider?: unknown;
  providerModel?: unknown;
}) {
  if (normalizeAlias(input.provider) === "higgsfield") return true;
  return [input.id, input.modelId, input.providerModel, input.name]
    .some((value) => retiredImageSet.has(normalizeAlias(value)) || retiredVideoSet.has(normalizeAlias(value)));
}

export function filterRetiredHiggsfieldModels<T extends {
  id?: unknown;
  modelId?: unknown;
  name?: unknown;
  provider?: unknown;
  providerModel?: unknown;
}>(models: T[]) {
  return models.filter((model) => !isRetiredHiggsfieldModel(model));
}

export const HIGGSFIELD_RETIRED_IMAGE_ALIASES = retiredImageAliases;
export const HIGGSFIELD_RETIRED_VIDEO_ALIASES = retiredVideoAliases;

import type { UploadMediaType } from "@/types/video";

export type VideoModelProvider = "seedance" | "veo" | "kling" | "wan" | "grok" | "generic";

export type VideoUploadSlot =
  | "media"
  | "image"
  | "video"
  | "audio"
  | "start_image"
  | "end_image"
  | "first_frame"
  | "last_frame"
  | "first_clip"
  | "last_frame_image"
  | "reference_image"
  | "reference_images"
  | "reference_video"
  | "reference_videos"
  | "reference_audio"
  | "reference_audios";

export type VideoRatio = "auto" | "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9" | string;
export type VideoQuality = "480p" | "720p" | "1080p" | "4K" | string;

export type VideoReferenceLimits = {
  total: number;
  image: number;
  video: number;
  audio: number;
};

export type VideoCreditRules = {
  baseCredits?: number;
  table?: Record<string, Partial<Record<VideoQuality, number>>>;
  durationMultiplier?: "linear_from_5s";
  qualityMultiplier?: Partial<Record<VideoQuality, number>>;
};

export type VideoModelRule = {
  modelId: string;
  label: string;
  provider: VideoModelProvider;
  supportedMediaTypes: UploadMediaType[];
  maxReferences: VideoReferenceLimits;
  uploadSlots: VideoUploadSlot[];
  ratios: VideoRatio[];
  durations: number[];
  qualities: VideoQuality[];
  resolutions: VideoQuality[];
  defaultRatio: VideoRatio;
  defaultDuration: number;
  defaultQuality: VideoQuality;
  supportsStartFrame: boolean;
  supportsEndFrame: boolean;
  supportsAudioReference: boolean;
  supportsVideoReference: boolean;
  supportsImageReference: boolean;
  supportsGeneratedResultAsReference: boolean;
  creditRules: VideoCreditRules;
  credits?: number;
  constraints: string[];
  notes: string[];
};

export type VideoModelParamInput = {
  ratio?: string;
  duration?: number;
  quality?: string;
  resolution?: string;
  generateAudio?: boolean;
};

export type NormalizedVideoModelParams = {
  ratio: string;
  duration: number;
  quality: string;
  resolution: string;
  generateAudio?: boolean;
};

const defaultReferenceLimits: VideoReferenceLimits = {
  total: 12,
  image: 9,
  video: 3,
  audio: 3,
};

const seedanceDurations = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const seedanceRatios: VideoRatio[] = ["16:9", "9:16", "4:3", "3:4", "1:1"];
const seedanceQualities: VideoQuality[] = ["720p", "1080p"];

const defaultRule: VideoModelRule = {
  modelId: "generic",
  label: "Generic video model",
  provider: "generic",
  supportedMediaTypes: ["image", "video", "audio"],
  maxReferences: defaultReferenceLimits,
  uploadSlots: ["media"],
  ratios: ["16:9", "9:16", "1:1"],
  durations: [5, 8, 10],
  qualities: ["720p", "1080p"],
  resolutions: ["720p", "1080p"],
  defaultRatio: "16:9",
  defaultDuration: 5,
  defaultQuality: "720p",
  supportsStartFrame: false,
  supportsEndFrame: false,
  supportsAudioReference: true,
  supportsVideoReference: true,
  supportsImageReference: true,
  supportsGeneratedResultAsReference: false,
  creditRules: {
    durationMultiplier: "linear_from_5s",
    qualityMultiplier: {
      "480p": 0.75,
      "720p": 1,
      "1080p": 1.6,
      "4K": 2.4,
    },
  },
  constraints: ["Fallback rule for unknown models. Keep UI permissive but avoid undefined parameters."],
  notes: ["Unknown model ids should use this rule until backend metadata is mapped."],
};

const concreteRules: VideoModelRule[] = [
  {
    ...defaultRule,
    modelId: "seedance_2_0",
    label: "Seedance 2.0",
    provider: "seedance",
    supportedMediaTypes: ["image", "video", "audio"],
    uploadSlots: ["media"],
    ratios: seedanceRatios,
    durations: seedanceDurations,
    qualities: seedanceQualities,
    resolutions: seedanceQualities,
    defaultRatio: "16:9",
    defaultDuration: 5,
    defaultQuality: "720p",
    supportsAudioReference: true,
    supportsVideoReference: true,
    supportsImageReference: true,
    constraints: ["Flexible media input. Keep prompt-only generation available."],
    notes: ["Calibrated to the current product controls and old workspace Seedance 2.0 media slot behavior."],
  },
  {
    ...defaultRule,
    modelId: "seedance_2_0_fast",
    label: "Seedance 2.0 Fast",
    provider: "seedance",
    supportedMediaTypes: ["image", "video", "audio"],
    uploadSlots: ["media"],
    ratios: seedanceRatios,
    durations: seedanceDurations,
    qualities: seedanceQualities,
    resolutions: seedanceQualities,
    defaultRatio: "16:9",
    defaultDuration: 5,
    defaultQuality: "720p",
    supportsAudioReference: true,
    supportsVideoReference: true,
    supportsImageReference: true,
    constraints: ["Keep backend metadata authoritative before adding provider-specific narrowing."],
    notes: ["Uses the same visible product controls as Seedance 2.0 until backend model metadata narrows it."],
  },
  {
    ...defaultRule,
    modelId: "veo3_1",
    label: "Google Veo 3.1",
    provider: "veo",
    supportedMediaTypes: ["image"],
    maxReferences: {
      total: 2,
      image: 2,
      video: 0,
      audio: 0,
    },
    uploadSlots: ["image", "last_frame_image"],
    ratios: ["16:9", "9:16"],
    durations: [5, 8],
    qualities: ["720p", "1080p"],
    resolutions: ["720p", "1080p"],
    defaultRatio: "16:9",
    defaultDuration: 5,
    defaultQuality: "720p",
    supportsStartFrame: true,
    supportsEndFrame: true,
    supportsAudioReference: false,
    supportsVideoReference: false,
    supportsImageReference: true,
    constraints: ["Last frame should only be enabled after a primary image is present."],
    notes: ["Matches the current Next fallback Veo model shape. Detailed Veo duration/quality pricing is deferred."],
  },
  {
    ...defaultRule,
    modelId: "kling_2_6",
    label: "Kling 2.6",
    provider: "kling",
    supportedMediaTypes: ["image", "video"],
    maxReferences: {
      total: 3,
      image: 2,
      video: 1,
      audio: 0,
    },
    uploadSlots: ["start_image", "end_image", "reference_video"],
    ratios: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    qualities: ["720p", "1080p"],
    resolutions: ["720p", "1080p"],
    defaultRatio: "16:9",
    defaultDuration: 5,
    defaultQuality: "720p",
    supportsStartFrame: true,
    supportsEndFrame: true,
    supportsAudioReference: false,
    supportsVideoReference: true,
    supportsImageReference: true,
    constraints: ["Use start/end images and reference video conservatively until live backend metadata is wired in."],
    notes: ["Provider family rule for Kling-like image/video workflows."],
  },
  {
    ...defaultRule,
    modelId: "kling_3_0",
    label: "Kling 3.0",
    provider: "kling",
    supportedMediaTypes: ["image", "video"],
    maxReferences: {
      total: 3,
      image: 2,
      video: 1,
      audio: 0,
    },
    uploadSlots: ["start_image", "end_image", "reference_video"],
    ratios: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    qualities: ["720p", "1080p"],
    resolutions: ["720p", "1080p"],
    defaultRatio: "16:9",
    defaultDuration: 5,
    defaultQuality: "720p",
    supportsStartFrame: true,
    supportsEndFrame: true,
    supportsAudioReference: false,
    supportsVideoReference: true,
    supportsImageReference: true,
    constraints: ["Use start/end images and reference video conservatively until live backend metadata is wired in."],
    notes: ["Provider family rule for Kling 3.x variants."],
  },
  {
    ...defaultRule,
    modelId: "wan_2_7",
    label: "Wan 2.7",
    provider: "wan",
    supportedMediaTypes: ["image", "video"],
    maxReferences: {
      total: 3,
      image: 2,
      video: 1,
      audio: 0,
    },
    uploadSlots: ["first_frame", "last_frame", "first_clip"],
    ratios: ["16:9", "9:16", "1:1"],
    durations: [5, 8],
    qualities: ["720p", "1080p"],
    resolutions: ["720p", "1080p"],
    defaultRatio: "16:9",
    defaultDuration: 5,
    defaultQuality: "720p",
    supportsStartFrame: true,
    supportsEndFrame: true,
    supportsAudioReference: false,
    supportsVideoReference: true,
    supportsImageReference: true,
    constraints: ["First clip should not be mixed with first frame once UI slot validation is enabled."],
    notes: ["Conservative provider family rule for Wan image/video workflows."],
  },
];

const modelRuleAliases: Record<string, string> = {
  "seedance 2.0": "seedance_2_0",
  seedance_20: "seedance_2_0",
  seedance20: "seedance_2_0",
  seedance2_0: "seedance_2_0",
  seedance_2: "seedance_2_0",
  seedance_v2: "seedance_2_0",
  seedance_v2_0: "seedance_2_0",
  seedance_2_0_lite: "seedance_2_0",
  text2video_seedance_2_0: "seedance_2_0",
  "seedance 2.0 fast": "seedance_2_0_fast",
  seedance_20_fast: "seedance_2_0_fast",
  seedance20_fast: "seedance_2_0_fast",
  seedance_fast: "seedance_2_0_fast",
  seedance_2_0_lite_fast: "seedance_2_0_fast",
  seedance_fast_2_0: "seedance_2_0_fast",
  seedance2_0_fast: "seedance_2_0_fast",
  text2video_seedance_2_0_fast: "seedance_2_0_fast",
  veo3: "veo3_1",
  veo_3: "veo3_1",
  veo3_1: "veo3_1",
  veo_3_1: "veo3_1",
  google_veo_3: "veo3_1",
  google_veo_3_1: "veo3_1",
  kling26: "kling_2_6",
  kling_26: "kling_2_6",
  kling2_6: "kling_2_6",
  kling30: "kling_3_0",
  kling_30: "kling_3_0",
  kling3_0: "kling_3_0",
  wan27: "wan_2_7",
  wan_27: "wan_2_7",
  wan2_7: "wan_2_7",
};

const rulesById = new Map(concreteRules.map((rule) => [normalizeModelId(rule.modelId), rule]));

function normalizeModelId(modelId: string) {
  return String(modelId || "")
    .trim()
    .toLowerCase()
    .replace(/[.\s-]+/g, "_")
    .replace(/[^\w]/g, "");
}

function resolveRuleId(modelId: string) {
  const normalized = normalizeModelId(modelId);
  return modelRuleAliases[normalized] || normalized;
}

function safeList<T>(values: T[] | undefined, fallback: T[]) {
  return values && values.length ? values : fallback;
}

function coerceDuration(value: unknown) {
  const duration = Number(value);
  return Number.isFinite(duration) ? duration : undefined;
}

export function getDefaultVideoModelRule(): VideoModelRule {
  return defaultRule;
}

export function hasVideoModelRule(modelId: string): boolean {
  return rulesById.has(resolveRuleId(modelId));
}

export function getVideoModelRule(modelId: string): VideoModelRule {
  return rulesById.get(resolveRuleId(modelId)) || defaultRule;
}

export function normalizeVideoParamsForModel(
  modelId: string,
  params: VideoModelParamInput,
): NormalizedVideoModelParams {
  const rule = getVideoModelRule(modelId);
  const ratios = safeList(rule.ratios, defaultRule.ratios).map(String);
  const durations = safeList(rule.durations, defaultRule.durations);
  const qualities = safeList(rule.qualities || rule.resolutions, defaultRule.qualities).map(String);
  const incomingDuration = coerceDuration(params.duration);
  const incomingQuality = String(params.quality || params.resolution || "");

  const ratio = ratios.includes(String(params.ratio || "")) ? String(params.ratio) : String(rule.defaultRatio);
  const duration =
    incomingDuration !== undefined && durations.includes(incomingDuration) ? incomingDuration : rule.defaultDuration;
  const quality = qualities.includes(incomingQuality) ? incomingQuality : String(rule.defaultQuality);

  return {
    ratio,
    duration,
    quality,
    resolution: quality,
    generateAudio: params.generateAudio,
  };
}

export const videoModelRules = concreteRules;

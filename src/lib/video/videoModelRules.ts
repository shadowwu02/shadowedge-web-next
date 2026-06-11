import type { UploadMediaType } from "@/types/video";

export type VideoModelProvider =
  | "seedance"
  | "veo"
  | "kling"
  | "wan"
  | "grok"
  | "minimax"
  | "cinematic"
  | "marketing"
  | "soul"
  | "generic";

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

export type VideoRatio = "auto" | "adaptive" | "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9" | "9:21" | string;
export type VideoQuality = "480p" | "720p" | "1080p" | "4K" | "512" | "768" | "fast" | "preview" | "basic" | "high" | "ultra" | string;

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
  modeMultiplier?: Record<string, number>;
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
  modes?: string[];
  defaultMode?: string;
  mediaMode?: string;
  qualityParam?: string | null;
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

const allMediaReferenceLimits: VideoReferenceLimits = {
  total: 12,
  image: 9,
  video: 3,
  audio: 3,
};

const imageOnlyReferenceLimits: VideoReferenceLimits = {
  total: 1,
  image: 1,
  video: 0,
  audio: 0,
};

const imagePairReferenceLimits: VideoReferenceLimits = {
  total: 2,
  image: 2,
  video: 0,
  audio: 0,
};

const startEndVideoReferenceLimits: VideoReferenceLimits = {
  total: 3,
  image: 2,
  video: 1,
  audio: 0,
};

const noReferenceLimits: VideoReferenceLimits = {
  total: 0,
  image: 0,
  video: 0,
  audio: 0,
};

const duration2To15 = range(2, 15);
const duration3To15 = range(3, 15);
const duration4To15 = range(4, 15);
const duration5To15 = range(5, 15);

const seedanceRatios: VideoRatio[] = ["auto", "16:9", "9:16", "4:3", "3:4", "1:1", "21:9"];
const fullHiggsfieldRatios: VideoRatio[] = ["auto", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
const seedanceQualities: VideoQuality[] = ["480p", "720p", "1080p"];
const standardQualities: VideoQuality[] = ["720p", "1080p"];
const defaultQualityMultiplier: Partial<Record<VideoQuality, number>> = {
  "480p": 0.75,
  "720p": 1,
  "1080p": 1.6,
  "4K": 2.4,
  "512": 0.75,
  "768": 1,
  fast: 1,
  preview: 2.4,
  basic: 1,
  high: 1.6,
  ultra: 2.4,
};

const defaultRule: VideoModelRule = {
  modelId: "generic",
  label: "Generic video model",
  provider: "generic",
  supportedMediaTypes: ["image", "video", "audio"],
  maxReferences: allMediaReferenceLimits,
  uploadSlots: ["media"],
  ratios: ["16:9", "9:16", "1:1"],
  durations: [5, 8, 10],
  qualities: standardQualities,
  resolutions: standardQualities,
  defaultRatio: "16:9",
  defaultDuration: 5,
  defaultQuality: "720p",
  supportsStartFrame: false,
  supportsEndFrame: false,
  supportsAudioReference: true,
  supportsVideoReference: true,
  supportsImageReference: true,
  supportsGeneratedResultAsReference: false,
  creditRules: withCreditBase(12),
  constraints: ["Fallback rule for unknown models. Keep UI permissive but avoid undefined parameters."],
  notes: ["Unknown model ids should use this rule until backend metadata is mapped."],
};

const concreteRules: VideoModelRule[] = [
  makeRule({
    modelId: "seedance_2_0",
    label: "Seedance 2.0",
    provider: "seedance",
    ratios: seedanceRatios,
    durations: duration5To15,
    qualities: seedanceQualities,
    uploadSlots: ["media"],
    supportsAudioReference: true,
    supportsVideoReference: true,
    supportsImageReference: true,
    supportsStartFrame: true,
    supportsEndFrame: true,
    supportsGeneratedResultAsReference: false,
    credits: 12,
    creditRules: withCreditBase(12),
    modes: ["std", "fast"],
    defaultMode: "std",
    mediaMode: "medias",
    qualityParam: "resolution",
    constraints: [
      "Legacy upload slot is media, with image/video/audio accepted.",
      "Reference images are capped at 9, reference videos at 3, and reference audios at 3.",
      "Reference audio total duration should stay under 15 seconds.",
    ],
    notes: [
      "Rules migrated from legacy /api/video/models normalization and backend Higgsfield seedance_2_0 config.",
      "Unified Seedance service also accepts 4s, but the visible legacy Higgsfield config starts at 5s.",
    ],
  }),
  makeRule({
    modelId: "seedance_2_0_fast",
    label: "Seedance 2.0 Fast",
    provider: "seedance",
    ratios: seedanceRatios,
    durations: duration4To15,
    qualities: ["720p", "1080p"],
    uploadSlots: ["media"],
    supportsAudioReference: true,
    supportsVideoReference: true,
    supportsImageReference: true,
    supportsStartFrame: true,
    supportsEndFrame: true,
    supportsGeneratedResultAsReference: false,
    credits: 12,
    creditRules: withCreditBase(12),
    mediaMode: "medias",
    qualityParam: "resolution",
    constraints: [
      "Legacy unified Seedance Fast model uses the same media slot behavior as Seedance 2.0.",
      "Reference images are capped at 9, reference videos at 3, and reference audios at 3.",
    ],
    notes: ["Rules migrated from seedance-unified-service.getUnifiedSeedanceFrontendModels()."],
  }),
  makeRule({
    modelId: "seedance1_5",
    label: "Seedance 1.5",
    provider: "seedance",
    ratios: seedanceRatios,
    durations: [4, 8, 12],
    qualities: seedanceQualities,
    uploadSlots: ["media"],
    supportsAudioReference: true,
    supportsVideoReference: true,
    supportsImageReference: true,
    credits: 12,
    creditRules: withCreditBase(12),
    mediaMode: "medias",
    qualityParam: "resolution",
    constraints: ["Legacy Higgsfield config exposes only 4s, 8s, and 12s for Seedance 1.5."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.seedance1_5."],
  }),
  makeRule({
    modelId: "veo3",
    label: "Google Veo 3",
    provider: "veo",
    supportedMediaTypes: ["image"],
    maxReferences: imageOnlyReferenceLimits,
    uploadSlots: ["image"],
    ratios: ["16:9", "9:16"],
    durations: [5],
    qualities: ["fast", "preview"],
    defaultQuality: "fast",
    supportsImageReference: true,
    credits: 35,
    creditRules: withCreditBase(35),
    modes: ["veo-3-fast", "veo-3-preview"],
    defaultMode: "veo-3-fast",
    mediaMode: "input_image",
    qualityParam: "model",
    constraints: ["Legacy config exposes a single image input slot."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.veo3."],
  }),
  makeRule({
    modelId: "veo3_1",
    label: "Google Veo 3.1",
    provider: "veo",
    supportedMediaTypes: ["image"],
    maxReferences: imageOnlyReferenceLimits,
    uploadSlots: ["image"],
    ratios: ["16:9", "9:16"],
    durations: [4, 6, 8],
    qualities: ["basic", "high", "ultra"],
    defaultDuration: 4,
    defaultQuality: "basic",
    supportsImageReference: true,
    credits: 32,
    creditRules: withCreditBase(32),
    modes: ["veo-3-1-fast", "veo-3-1-preview"],
    defaultMode: "veo-3-1-fast",
    mediaMode: "input_image",
    qualityParam: "quality",
    constraints: ["Legacy guide notes 1080p/high-quality Veo usage should use 8s duration."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.veo3_1."],
  }),
  makeRule({
    modelId: "veo3_1_lite",
    label: "Veo 3.1 Lite",
    provider: "veo",
    supportedMediaTypes: ["image", "video", "audio"],
    uploadSlots: ["media"],
    ratios: ["16:9", "9:16", "auto"],
    durations: [4, 6, 8],
    qualities: ["720p"],
    defaultDuration: 4,
    supportsAudioReference: true,
    supportsVideoReference: true,
    supportsImageReference: true,
    credits: 22,
    creditRules: withCreditBase(22),
    mediaMode: "medias",
    constraints: ["Legacy Higgsfield config uses media slot; WaveSpeed route only supports image-to-video."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.veo3_1_lite and WaveSpeed Veo 3.1 Lite metadata."],
  }),
  makeRule({
    modelId: "grok_video",
    label: "Grok Imagine Video",
    provider: "grok",
    supportedMediaTypes: ["image", "video"],
    uploadSlots: ["media"],
    ratios: ["16:9", "9:16", "1:1"],
    durations: duration5To15,
    qualities: ["720p"],
    supportsVideoReference: true,
    supportsImageReference: true,
    credits: 18,
    creditRules: withCreditBase(18),
    mediaMode: "medias",
    constraints: ["Legacy guide recommends using either image or video, not both, for clearer results."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.grok_video and legacy workflow guide text."],
  }),
  makeRule({
    modelId: "kling2_6",
    label: "Kling 2.6",
    provider: "kling",
    supportedMediaTypes: ["image"],
    maxReferences: imageOnlyReferenceLimits,
    uploadSlots: ["image"],
    ratios: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    qualities: ["720p"],
    supportsImageReference: true,
    credits: 18,
    creditRules: withCreditBase(18),
    mediaMode: "input_image",
    constraints: ["Legacy config exposes a single image input slot."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.kling2_6."],
  }),
  makeRule({
    modelId: "kling3_0",
    label: "Kling 3.0",
    provider: "kling",
    supportedMediaTypes: ["image", "video", "audio"],
    uploadSlots: ["media"],
    ratios: ["16:9", "9:16", "1:1"],
    durations: duration5To15,
    qualities: ["720p"],
    supportsAudioReference: true,
    supportsVideoReference: true,
    supportsImageReference: true,
    credits: 22,
    creditRules: withCreditBase(22),
    modes: ["std", "pro"],
    defaultMode: "std",
    mediaMode: "medias",
    qualityParam: null,
    constraints: ["Legacy guide warns reference video and audio generation should not be mixed randomly."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.kling3_0."],
  }),
  makeRule({
    modelId: "kling_3_0_4k",
    label: "Kling 3.0 4K",
    provider: "kling",
    supportedMediaTypes: ["image"],
    maxReferences: imagePairReferenceLimits,
    uploadSlots: ["start_image", "end_image"],
    ratios: ["adaptive"],
    durations: duration3To15,
    qualities: ["4K"],
    defaultDuration: 3,
    defaultRatio: "adaptive",
    defaultQuality: "4K",
    supportsStartFrame: true,
    supportsEndFrame: true,
    supportsImageReference: true,
    credits: 22,
    creditRules: withCreditBase(22),
    mediaMode: "input_image",
    constraints: ["WaveSpeed model is image-to-video and accepts optional end image."],
    notes: ["Migrated from wavespeed-video-service Kling 3.0 4K metadata."],
  }),
  makeRule({
    modelId: "wan2_6",
    label: "Wan 2.6",
    provider: "wan",
    uploadSlots: ["media"],
    ratios: ["16:9", "9:16", "1:1"],
    durations: [5, 10, 15],
    qualities: standardQualities,
    supportsVideoReference: true,
    supportsImageReference: true,
    credits: 16,
    creditRules: withCreditBase(16),
    mediaMode: "medias",
    qualityParam: "quality",
    constraints: ["Legacy config uses media slot for Wan 2.6."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.wan2_6."],
  }),
  makeRule({
    modelId: "wan2_7",
    label: "Wan 2.7",
    provider: "wan",
    uploadSlots: ["media"],
    ratios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    durations: duration5To15,
    qualities: standardQualities,
    supportsVideoReference: true,
    supportsImageReference: true,
    credits: 18,
    creditRules: withCreditBase(18),
    mediaMode: "medias",
    qualityParam: "resolution",
    constraints: ["Legacy guide notes first clip should not be mixed with first frame in advanced Wan flows."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.wan2_7."],
  }),
  makeRule({
    modelId: "wan_2_7_i2v",
    label: "Wan 2.7 I2V",
    provider: "wan",
    supportedMediaTypes: ["image", "video", "audio"],
    maxReferences: {
      total: 4,
      image: 2,
      video: 1,
      audio: 1,
    },
    uploadSlots: ["first_frame", "last_frame", "first_clip", "audio"],
    ratios: ["adaptive", "16:9", "9:16", "4:3", "3:4", "1:1"],
    durations: duration2To15,
    qualities: standardQualities,
    defaultDuration: 2,
    defaultRatio: "adaptive",
    supportsStartFrame: true,
    supportsEndFrame: true,
    supportsAudioReference: true,
    supportsVideoReference: true,
    supportsImageReference: true,
    credits: 18,
    creditRules: withCreditBase(18),
    constraints: [
      "WaveSpeed Wan I2V requires image for normal generation.",
      "First Clip cannot be used together with First Frame.",
      "Last Frame requires First Frame.",
    ],
    notes: ["Migrated from backend audit/WaveSpeed Wan 2.7 I2V metadata."],
  }),
  makeRule({
    modelId: "cinematic_studio_3_0",
    label: "Cinematic Studio 3.0",
    provider: "cinematic",
    uploadSlots: ["media"],
    ratios: ["16:9", "9:16", "1:1"],
    durations: duration5To15,
    qualities: ["720p"],
    credits: 14,
    creditRules: withCreditBase(14),
    mediaMode: "medias",
    constraints: ["Filtered out of the current general Video Workspace model list by backend route."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.cinematic_studio_3_0 for future registry completeness."],
  }),
  makeRule({
    modelId: "cinematic_studio_video",
    label: "Cinematic Studio Video",
    provider: "cinematic",
    uploadSlots: ["media"],
    ratios: ["1:1", "4:3", "3:4", "16:9", "9:16"],
    durations: [5, 10],
    qualities: ["720p"],
    credits: 14,
    creditRules: withCreditBase(14),
    mediaMode: "medias",
    constraints: ["Filtered out of the current general Video Workspace model list by backend route."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.cinematic_studio_video for future registry completeness."],
  }),
  makeRule({
    modelId: "cinematic_studio_video_v2",
    label: "Cinematic Studio Video V2",
    provider: "cinematic",
    uploadSlots: ["media"],
    ratios: ["1:1", "4:3", "3:4", "16:9", "9:16"],
    durations: duration5To15,
    qualities: ["720p"],
    credits: 16,
    creditRules: withCreditBase(16),
    modes: ["std", "pro"],
    defaultMode: "std",
    mediaMode: "medias",
    constraints: ["Filtered out of the current general Video Workspace model list by backend route."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.cinematic_studio_video_v2 for future registry completeness."],
  }),
  makeRule({
    modelId: "marketing_studio_video",
    label: "Marketing Studio Video",
    provider: "marketing",
    uploadSlots: ["media"],
    ratios: fullHiggsfieldRatios,
    durations: duration5To15,
    qualities: seedanceQualities,
    supportsAudioReference: true,
    supportsVideoReference: true,
    supportsImageReference: true,
    credits: 18,
    creditRules: withCreditBase(18),
    modes: [
      "ugc",
      "ugc_how_to",
      "ugc_unboxing",
      "product_showcase",
      "product_review",
      "tv_spot",
      "wild_card",
      "ugc_virtual_try_on",
      "virtual_try_on",
    ],
    defaultMode: "ugc",
    mediaMode: "medias",
    qualityParam: "resolution",
    constraints: ["Filtered out of the current general Video Workspace model list by backend route."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.marketing_studio_video for future registry completeness."],
  }),
  makeRule({
    modelId: "minimax_hailuo",
    label: "Minimax Hailuo",
    provider: "minimax",
    supportedMediaTypes: ["image"],
    maxReferences: {
      total: 9,
      image: 9,
      video: 0,
      audio: 0,
    },
    uploadSlots: ["reference_images"],
    ratios: ["auto"],
    durations: [6, 10],
    qualities: ["512", "768", "1080"],
    defaultDuration: 6,
    defaultRatio: "auto",
    defaultQuality: "512",
    supportsImageReference: true,
    credits: 14,
    creditRules: withCreditBase(14),
    modes: ["minimax", "minimax-fast", "minimax-2.3", "minimax-2.3-fast"],
    defaultMode: "minimax-2.3",
    mediaMode: "input_images",
    qualityParam: "resolution",
    constraints: ["Legacy config uses reference_images slot only."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.minimax_hailuo."],
  }),
  makeRule({
    modelId: "soul_cast",
    label: "Soul Cast",
    provider: "soul",
    supportedMediaTypes: [],
    maxReferences: noReferenceLimits,
    uploadSlots: [],
    ratios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "5:4", "4:5", "21:9", "9:21"],
    durations: [5],
    qualities: ["720p"],
    supportsImageReference: false,
    supportsVideoReference: false,
    supportsAudioReference: false,
    credits: 10,
    creditRules: withCreditBase(10),
    mediaMode: "none",
    constraints: ["Filtered out of the current general Video Workspace model list by backend route."],
    notes: ["Migrated from HIGGSFIELD_VIDEO_CONFIG.soul_cast for future registry completeness."],
  }),
];

const modelRuleAliases: Record<string, string> = {
  seedance_2_0: "seedance_2_0",
  seedance_20: "seedance_2_0",
  seedance20: "seedance_2_0",
  seedance2_0: "seedance_2_0",
  seedance_2: "seedance_2_0",
  seedance_v2: "seedance_2_0",
  seedance_v2_0: "seedance_2_0",
  seedance_2_0_lite: "seedance_2_0",
  seedance_2_0_image_to_video: "seedance_2_0",
  bytedance_seedance_2_0: "seedance_2_0",
  bytedance_seedance_2_0_image_to_video: "seedance_2_0",
  bytedance_seedance_2_0_text_to_video: "seedance_2_0",
  bytedance_seedance_2_0_video_edit: "seedance_2_0",
  bytedance_seedance_2_0_video_extend: "seedance_2_0",
  text2video_seedance_2_0: "seedance_2_0",
  doubao_seedance_2: "seedance_2_0",

  seedance_2_0_fast: "seedance_2_0_fast",
  seedance_20_fast: "seedance_2_0_fast",
  seedance20_fast: "seedance_2_0_fast",
  seedance_fast: "seedance_2_0_fast",
  seedance_fast_2_0: "seedance_2_0_fast",
  seedance2_0_fast: "seedance_2_0_fast",
  seedance_2_0_fast_image_to_video: "seedance_2_0_fast",
  seedance_2_0_lite_fast: "seedance_2_0_fast",
  bytedance_seedance_2_0_fast: "seedance_2_0_fast",
  bytedance_seedance_2_0_fast_image_to_video: "seedance_2_0_fast",
  bytedance_seedance_2_0_fast_text_to_video: "seedance_2_0_fast",
  bytedance_seedance_2_0_fast_video_edit: "seedance_2_0_fast",
  bytedance_seedance_2_0_fast_video_extend: "seedance_2_0_fast",
  text2video_seedance_2_0_fast: "seedance_2_0_fast",

  seedance_1_5: "seedance1_5",
  seedance15: "seedance1_5",
  seedance1_5: "seedance1_5",

  veo3: "veo3",
  veo_3: "veo3",
  google_veo_3: "veo3",

  veo3_1: "veo3_1",
  veo_3_1: "veo3_1",
  google_veo_3_1: "veo3_1",

  veo3_1_lite: "veo3_1_lite",
  veo_3_1_lite: "veo3_1_lite",
  google_veo3_1_lite: "veo3_1_lite",
  google_veo3_1_lite_image_to_video: "veo3_1_lite",
  google_veo_3_1_lite: "veo3_1_lite",
  google_veo_3_1_lite_image_to_video: "veo3_1_lite",

  grok: "grok_video",
  grok_video: "grok_video",
  grok_imagine: "grok_video",
  xai_grok_imagine_video: "grok_video",

  kling26: "kling2_6",
  kling_26: "kling2_6",
  kling2_6: "kling2_6",
  kling_2_6: "kling2_6",

  kling30: "kling3_0",
  kling_30: "kling3_0",
  kling3_0: "kling3_0",
  kling_3_0: "kling3_0",
  kling_v3_video: "kling3_0",

  kling_3_0_4k: "kling_3_0_4k",
  kling3_0_4k: "kling_3_0_4k",
  kling_30_4k: "kling_3_0_4k",
  kwaivgi_kling_v3_0_4k_image_to_video: "kling_3_0_4k",

  wan26: "wan2_6",
  wan_26: "wan2_6",
  wan2_6: "wan2_6",
  wan_2_6: "wan2_6",

  wan27: "wan2_7",
  wan_27: "wan2_7",
  wan2_7: "wan2_7",
  wan_2_7: "wan2_7",
  alibaba_wan_2_7_image_to_video: "wan_2_7_i2v",
  wan_video_wan_2_7_i2v: "wan_2_7_i2v",

  cinematic_studio_3_0: "cinematic_studio_3_0",
  cinematic_studio_video: "cinematic_studio_video",
  cinematic_studio_video_v2: "cinematic_studio_video_v2",
  marketing_studio_video: "marketing_studio_video",
  minimax: "minimax_hailuo",
  minimax_hailuo: "minimax_hailuo",
  hailuo: "minimax_hailuo",
  soul_cast: "soul_cast",
};

const rulesById = new Map(concreteRules.map((rule) => [normalizeModelId(rule.modelId), rule]));

function range(min: number, max: number) {
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => min + index);
}

function withCreditBase(baseCredits: number): VideoCreditRules {
  return {
    baseCredits,
    durationMultiplier: "linear_from_5s",
    qualityMultiplier: defaultQualityMultiplier,
    modeMultiplier: {
      pro: 1.5,
      preview: 1.5,
      fast: 0.9,
    },
  };
}

function makeRule(rule: Partial<VideoModelRule> & Pick<VideoModelRule, "modelId" | "label" | "provider">): VideoModelRule {
  const qualities = rule.qualities || rule.resolutions || defaultRule.qualities;
  const uploadSlots = rule.uploadSlots || defaultRule.uploadSlots;

  return {
    ...defaultRule,
    ...rule,
    uploadSlots,
    qualities,
    resolutions: rule.resolutions || qualities,
    maxReferences: rule.maxReferences || inferReferenceLimits(uploadSlots),
    defaultRatio: rule.defaultRatio || rule.ratios?.[0] || defaultRule.defaultRatio,
    defaultDuration: rule.defaultDuration || rule.durations?.[0] || defaultRule.defaultDuration,
    defaultQuality: rule.defaultQuality || qualities[0] || defaultRule.defaultQuality,
    supportsStartFrame: rule.supportsStartFrame ?? uploadSlots.some((slot) => slot.includes("start") || slot.includes("first")),
    supportsEndFrame: rule.supportsEndFrame ?? uploadSlots.some((slot) => slot.includes("end") || slot.includes("last")),
    supportsAudioReference:
      rule.supportsAudioReference ?? uploadSlots.some((slot) => slot.includes("audio") || slot === "media"),
    supportsVideoReference:
      rule.supportsVideoReference ?? uploadSlots.some((slot) => slot.includes("video") || slot.includes("clip") || slot === "media"),
    supportsImageReference:
      rule.supportsImageReference ??
      uploadSlots.some((slot) => slot.includes("image") || slot.includes("frame") || slot === "media"),
    creditRules: rule.creditRules || withCreditBase(rule.credits || defaultRule.creditRules.baseCredits || 12),
    constraints: rule.constraints || [],
    notes: rule.notes || [],
  };
}

function inferReferenceLimits(uploadSlots: VideoUploadSlot[]): VideoReferenceLimits {
  if (!uploadSlots.length) return noReferenceLimits;
  if (uploadSlots.includes("media")) return allMediaReferenceLimits;
  if (uploadSlots.includes("reference_images")) {
    return {
      total: 9,
      image: 9,
      video: 0,
      audio: 0,
    };
  }
  if (uploadSlots.some((slot) => slot.includes("video") || slot.includes("clip"))) return startEndVideoReferenceLimits;
  if (uploadSlots.length > 1) return imagePairReferenceLimits;
  return imageOnlyReferenceLimits;
}

function normalizeModelId(modelId: string) {
  return String(modelId || "")
    .trim()
    .toLowerCase()
    .replace(/[./\s-]+/g, "_")
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
  const qualities = safeList(rule.qualities.length ? rule.qualities : rule.resolutions, defaultRule.qualities).map(String);
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

export function estimateVideoCreditsForParams(
  modelId: string,
  params: VideoModelParamInput,
  fallbackCredits = 12,
) {
  const rule = getVideoModelRule(modelId);
  const normalized = normalizeVideoParamsForModel(modelId, params);
  const creditRules = rule.creditRules || {};
  const base = Number(creditRules.baseCredits || rule.credits || fallbackCredits || defaultRule.creditRules.baseCredits || 12);
  const durationFactor = creditRules.durationMultiplier === "linear_from_5s"
    ? Math.max(1, normalized.duration / 5)
    : 1;
  const qualityMultiplier = creditRules.qualityMultiplier?.[normalized.quality] ?? defaultQualityMultiplier[normalized.quality] ?? 1;
  const estimated = Math.ceil(base * durationFactor * qualityMultiplier);

  return Math.max(1, estimated);
}

export const videoModelRules = concreteRules;

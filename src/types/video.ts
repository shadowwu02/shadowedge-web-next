export type VideoTaskStatus =
  | "created"
  | "queued"
  | "pending"
  | "submitted"
  | "submitting"
  | "starting"
  | "waiting"
  | "processing"
  | "running"
  | "generating"
  | "finalizing"
  | "long_running"
  | "completed"
  | "success"
  | "succeeded"
  | "done"
  | "failed"
  | "error"
  | "canceled"
  | "cancelled"
  | "rejected"
  | "unknown";

export type UploadMediaType = "image" | "video" | "audio";
export type UploadMediaRole = "reference" | "start_frame" | "end_frame";
export type UploadMediaSource =
  | "current_upload"
  | "local_upload_cache"
  | "reference_selected"
  | "asset-library"
  | "generated_result"
  | "history"
  | "unknown";

export type UploadMediaItem = {
  id: string;
  assetId?: string;
  canonicalReferenceStatus?: "CANONICAL" | "LEGACY_REFERENCE_REUPLOAD_REQUIRED";
  type: UploadMediaType;
  role?: UploadMediaRole;
  source?: UploadMediaSource;
  file?: File;
  name: string;
  previewUrl?: string;
  previewExpiresAt?: string;
  privateReference?: boolean;
  url?: string;
  size?: number;
  mimeType?: string;
  filename?: string;
  originalName?: string;
  duration?: number;
  uploadStatus?: "local" | "uploading" | "ready" | "failed";
  errorMessage?: string;
  providerAssetReview?: {
    referenceBindingProfileId: string;
    assetType: UploadMediaType;
    status: "NOT_SUBMITTED" | "PROCESSING" | "ACTIVE" | "FAILED";
    isCurrent?: boolean;
    authoritySource?: "BASE" | "SUPERSEDING";
    authorityGeneration?: number;
    safeErrorCategory?: string;
  };
};

export type UploadedMediaResponse = {
  id: string;
  assetId?: string;
  type: UploadMediaType;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  filename?: string;
  originalName?: string;
  previewUrl?: string;
  duration?: number;
  raw?: unknown;
};

export type VideoCreditRulesContract = {
  schemaVersion?: string;
  pricingVersion?: string;
  baseCredits?: number;
  table?: Record<string, Partial<Record<string, number>>>;
  durationMultiplier?: "linear_from_5s";
  qualityMultiplier?: Partial<Record<string, number>>;
  modeMultiplier?: Record<string, number>;
  referenceSurchargeCredits?: number;
};

export type VideoDurationPolicy = {
  type: "range" | "values";
  selection: "discrete" | "discrete_range";
  min: number;
  max: number;
  step: number;
};

export type VideoAudioReferenceCapability = {
  enabled: boolean;
  beta: boolean;
  max: number;
  formats: string[];
  mimeTypes: string[];
  maxFileBytes: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
  serializer?: string;
  surchargeCredits: number;
  consumptionEvidence?: string;
  semanticEffect?: string;
  audioOnly?: boolean;
  requiresImage?: boolean;
  maxMixedImages?: number;
  maxMixedVideos?: number;
};

export type VideoTuplePricingStatus = "READY" | "MISSING_REQUIRES_OWNER_DECISION";

export type VideoTupleCapability = {
  duration: number;
  resolution: string;
  allowedAspectRatios: string[];
  audio: {
    supported: boolean;
    default: boolean;
  };
  pricing: {
    status: VideoTuplePricingStatus;
    pricingVersion: string | null;
    currentCustomerCredits: number | null;
    reason?: "CUSTOMER_PRICE_MISSING";
  };
};

export type VideoModel = {
  id: string;
  label: string;
  provider?: string;
  providerModel?: string;
  referenceBindingProfileId?: string;
  productLine?: "existing" | "international";
  customerPricingStatus?: "READY" | "MISSING_OWNER_DECISION";
  customerExecutionEnabled?: boolean;
  catalogVisible?: boolean;
  catalogSelectable?: boolean;
  configurationEnabled?: boolean;
  internationalCapabilities?: {
    family: "2.0" | "2.5";
    imageMax?: number;
    videoMax?: number;
    audioMax?: number;
    videoTotalDurationMax?: number;
    audioTotalDurationMax?: number;
    referenceCountLimitsVerified?: boolean;
  };
  available?: boolean;
  availability?: string;
  maintenanceMessage?: string;
  desc?: string;
  credits: number;
  maxPromptLength: number;
  creditBase?: number;
  creditRules?: VideoCreditRulesContract;
  durations: number[];
  durationDefault: number;
  durationPolicy?: VideoDurationPolicy;
  ratios: string[];
  qualities: string[];
  supportsAudio?: boolean;
  audioDefault?: boolean;
  tupleCapabilities?: VideoTupleCapability[];
  uploadSlots?: string[];
  referenceImages?: boolean;
  maxReferenceImages?: number;
  referenceVideos?: boolean;
  maxReferenceVideos?: number;
  referenceAudios?: boolean;
  maxReferenceAudios?: number;
  audioReference?: VideoAudioReferenceCapability;
  maxTotalReferences?: number;
  mixedReference?: {
    imageVideo?: boolean;
    maxImages?: number;
    maxVideos?: number;
    imageAudio?: boolean;
    videoAudio?: boolean;
    imageVideoAudio?: boolean;
  };
  imagePlusGenerateAudio?: boolean;
  raw?: unknown;
};

export type VideoGenerationRequest = {
  clientRequestId: string;
  client_request_id: string;
  prompt: string;
  frontendModel: string;
  model: string;
  modelId: string;
  providerModel?: string;
  duration: number;
  aspect_ratio: string;
  ratio: string;
  resolution: string;
  quality: string;
  generate_audio: boolean;
  assets: {
    images: string[];
    videos: string[];
    audios: string[];
  };
  first_frame_image: string;
  last_frame_image: string;
  reference_images: string[];
  reference_videos: string[];
  reference_audios: string[];
  reference_image_asset_ids: string[];
  reference_video_asset_ids: string[];
  reference_audio_asset_ids: string[];
  references?: Array<{
    assetId: string;
    type: UploadMediaType;
    role: "reference_image" | "first_frame" | "last_frame" | "reference_video" | "reference_audio";
  }>;
  mediaList: Array<{
    id?: string;
    type: UploadMediaType;
    url: string;
    role?: string;
    duration?: number;
    name?: string;
    mimeType?: string;
    size?: number;
  }>;
  mode: string;
  image: string;
  imageUrl: string;
  video: string;
  videoUrl: string;
  upload_assets: {
    media: Array<{
      id?: string;
      type: UploadMediaType;
      url: string;
      name?: string;
      mimeType?: string;
      size?: number;
      duration?: number;
    }>;
  };
  clientCost: number;
  pricingVersion?: string;
  pricing_version?: string;
  creditAmount?: number;
  meta: Record<string, unknown>;
};

export type VideoTaskRecord = {
  jobId: string;
  providerJobId?: string;
  dbJobId?: string | null;
  status: VideoTaskStatus | string;
  model?: string;
  modelId?: string;
  frontendModel?: string;
  providerModel?: string;
  provider?: string;
  duration?: string;
  ratio?: string;
  quality?: string;
  prompt?: string;
  videoUrl?: string;
  outputUrl?: string;
  output_url?: string;
  outputUrls?: string[];
  thumbnail?: string;
  thumbnailUrl?: string;
  first_frame_image?: string;
  firstFrameImage?: string;
  last_frame_image?: string;
  lastFrameImage?: string;
  reference_images?: string[];
  reference_videos?: string[];
  reference_audios?: string[];
  mediaList?: VideoGenerationRequest["mediaList"];
  assets?: Record<string, unknown>;
  upload_assets?: Record<string, unknown>;
  uploadAssets?: Record<string, unknown>;
  error_message?: string;
  errorCode?: string;
  providerPublicMessage?: string;
  providerPublicMessageEn?: string;
  providerPublicMessageZh?: string;
  providerFailureCategory?: string;
  message?: string;
  cost_credits?: number;
  createdAt: number | string;
  updatedAt?: number | string;
  completedAt?: number | string;
  replacement?: unknown;
  meta?: Record<string, unknown>;
};

export type VideoHistoryItem = VideoTaskRecord & {
  outputUrl?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  retryable?: boolean;
  source?: "server" | "local";
};

export type VideoStatusResponse = {
  jobId?: string;
  dbJobId?: string;
  providerJobId?: string;
  status?: string;
  videoUrl?: string;
  outputUrl?: string;
  output_url?: string;
  outputUrls?: string[];
  output_urls?: string[];
  thumbnail?: string;
  thumbnailUrl?: string;
  provider?: string;
  providerModel?: string;
  model?: string;
  completedAt?: string;
  completed_at?: string;
  error?: string;
  error_message?: string;
  errorMessage?: string;
  errorCode?: string;
  error_code?: string;
  providerPublicMessage?: string;
  providerPublicMessageEn?: string;
  providerPublicMessageZh?: string;
  providerFailureCategory?: string;
  resultAssetId?: string;
  replacement?: unknown;
  public_message?: string;
  refunded?: boolean;
  refund_amount?: number;
  message?: string;
  creditsBalance?: number;
  cost_credits?: number;
};

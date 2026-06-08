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
  | "generated_result"
  | "history"
  | "unknown";

export type UploadMediaItem = {
  id: string;
  type: UploadMediaType;
  role?: UploadMediaRole;
  source?: UploadMediaSource;
  file?: File;
  name: string;
  previewUrl?: string;
  url?: string;
  size?: number;
  mimeType?: string;
  filename?: string;
  originalName?: string;
  duration?: number;
  uploadStatus?: "local" | "uploading" | "ready" | "failed";
  errorMessage?: string;
};

export type UploadedMediaResponse = {
  id: string;
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

export type VideoModel = {
  id: string;
  label: string;
  provider?: string;
  providerModel?: string;
  desc?: string;
  credits: number;
  creditBase?: number;
  durations: number[];
  durationDefault: number;
  ratios: string[];
  qualities: string[];
  supportsAudio?: boolean;
  uploadSlots?: string[];
  raw?: unknown;
};

export type VideoGenerationRequest = {
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
  outputUrls?: string[];
  thumbnail?: string;
  thumbnailUrl?: string;
  reference_images?: string[];
  reference_videos?: string[];
  reference_audios?: string[];
  mediaList?: VideoGenerationRequest["mediaList"];
  error_message?: string;
  errorCode?: string;
  message?: string;
  cost_credits?: number;
  createdAt: number | string;
  updatedAt?: number | string;
  completedAt?: number | string;
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
  outputUrls?: string[];
  output_urls?: string[];
  provider?: string;
  providerModel?: string;
  model?: string;
  completedAt?: string;
  completed_at?: string;
  error?: string;
  error_message?: string;
  errorMessage?: string;
  message?: string;
  creditsBalance?: number;
  cost_credits?: number;
};

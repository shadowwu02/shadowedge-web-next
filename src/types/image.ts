export type ImageJobStatusValue =
  | "created"
  | "queued"
  | "pending"
  | "submitted"
  | "submitting"
  | "processing"
  | "running"
  | "generating"
  | "completed"
  | "success"
  | "succeeded"
  | "done"
  | "failed"
  | "error"
  | "canceled"
  | "cancelled"
  | "unknown";

export type ImageCreditRules = {
  baseCredits?: number;
  unit?: "image" | string;
  batchMultiplier?: boolean;
  resolutionCredits?: Record<string, number>;
  qualityCredits?: Record<string, number>;
};

export type ImageModelCapabilities = {
  textToImage: boolean;
  imageToImage: boolean;
  maxReferences: number;
  maxBatchCount: number;
  ratios: string[];
  resolutions: string[];
  qualities: string[];
  supportsSeed?: boolean;
};

export type ImageModelDefaults = {
  ratio?: string;
  resolution?: string;
  quality?: string;
  batchCount?: number;
};

export type ImageModel = {
  id: string;
  name: string;
  label: string;
  provider: string;
  providerModel: string;
  capabilities: ImageModelCapabilities;
  creditRules: ImageCreditRules;
  defaults: ImageModelDefaults;
  raw?: unknown;
};

export type ImageGenerationParams = {
  ratio: string;
  resolution: string;
  quality: string;
  batchCount: number;
};

export type ImageReferenceItem = {
  id: string;
  type: "image";
  name: string;
  file?: File;
  url?: string;
  previewUrl?: string;
  size?: number;
  mimeType?: string;
  filename?: string;
  originalName?: string;
  uploadStatus?: "local" | "uploading" | "ready" | "failed";
  errorMessage?: string;
  width?: number;
  height?: number;
  uploadedAt?: string;
  raw?: unknown;
};

export type ImageUploadResponse = ImageReferenceItem;

export type ImageGenerateRequest = {
  prompt: string;
  model: string;
  modelId?: string;
  providerModel?: string;
  ratio?: string;
  aspect_ratio?: string;
  resolution?: string;
  quality?: string;
  batchCount?: number;
  count?: number;
  referenceImages?: string[];
  reference_images?: string[];
  meta?: Record<string, unknown>;
};

export type ImageGenerateResponse = {
  jobId: string;
  dbJobId: string;
  status: ImageJobStatusValue | string;
  provider: string;
  model: string;
  providerModel: string;
  cost: number;
  creditsBalance?: number;
  estimatedOutputCount: number;
  params: ImageGenerationParams;
  raw?: unknown;
};

export type ImageJobStatus = {
  id: string;
  jobId: string;
  dbJobId: string;
  status: ImageJobStatusValue | string;
  prompt: string;
  model: string;
  provider: string;
  providerModel: string;
  outputUrls: string[];
  outputUrl: string;
  ratio: string;
  resolution: string;
  quality: string;
  batchCount: number;
  referenceCount: number;
  cost: number;
  creditsCharged: number;
  errorClassificationMessage: string;
  errorMessage: string;
  errorCode: string;
  errorPublicMessageEn: string;
  errorPublicMessageZh: string;
  refunded: boolean;
  refundStatus?: "none" | "refunded" | "retry_pending" | string;
  meta?: Record<string, unknown>;
  createdAt: string | number;
  updatedAt?: string | number;
  progress?: number | null;
  raw?: unknown;
};

export type ImageHistoryItem = ImageJobStatus & {
  source?: "server" | "local";
};

export type ImageWorkspaceState = {
  models: ImageModel[];
  loadingModels: boolean;
  selectedModel: ImageModel | null;
  params: ImageGenerationParams;
  references: ImageReferenceItem[];
  prompt: string;
  currentJob: ImageHistoryItem | null;
  outputs: ImageHistoryItem[];
  history: ImageHistoryItem[];
  isGenerating: boolean;
  isPolling: boolean;
  error: string;
};

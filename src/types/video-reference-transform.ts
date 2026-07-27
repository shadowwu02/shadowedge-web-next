export type VideoReferenceTransformCostStatus = "VERIFIED" | "UNKNOWN" | "TIMEOUT";
export type VideoReferenceTransformOperationStatus =
  | "PENDING"
  | "SUBMITTING"
  | "SUBMITTED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "UNCERTAIN";

export type VideoReferenceTransformParams = {
  model: "seedance_2_0";
  duration: 5;
  aspectRatio: "16:9";
  resolution: "720p";
  mode: "std";
  generateAudio: boolean;
};

export type VideoReferenceTransformSource = {
  sourceAssetId: string;
  sourceJobId: string | null;
  sourceProviderMediaInputId: string | null;
  providerMediaType: "video";
  providerBindingStatus: "AVAILABLE";
  providerMediaInputVerificationStatus: "VERIFIED";
  url: string;
  displayName: string;
  duration: number | null;
};

export type VideoReferenceTransformPreview = {
  previewId: string;
  operation: "VIDEO_REFERENCE_TRANSFORM";
  source: VideoReferenceTransformSource;
  prompt: string;
  params: VideoReferenceTransformParams;
  estimatedCredits: number | null;
  costStatus: VideoReferenceTransformCostStatus;
  provider: { id: string; model: "seedance_2_0"; schemaVersion: string | null; ready: boolean };
  riskFlags: string[];
  status: "READY" | "BLOCKED" | "EXPIRED";
  boundary: string;
  createdAt: string;
  expiresAt: string;
};

export type VideoReferenceTransformOperation = {
  operationId: string;
  previewId: string;
  operation: "VIDEO_REFERENCE_TRANSFORM";
  status: VideoReferenceTransformOperationStatus;
  source: VideoReferenceTransformSource;
  promptSnapshot: string;
  paramsSnapshot: VideoReferenceTransformParams;
  estimatedCredits: number;
  creditsCharged: number;
  billingJobId: string | null;
  outboxId: string | null;
  providerTrackingId: string | null;
  providerJobId: string | null;
  providerMediaInputId: string | null;
  resultProviderMediaInputId: string | null;
  resultUrl: string | null;
  resultAssetId: string | null;
  errorCode?: string;
  errorMessage?: string;
  refunded: boolean;
  refundStatus: string;
  lineage: {
    sourceAssetId: string;
    sourceJobId: string | null;
    operationId: string;
    providerMediaInputId: string | null;
    providerJobId: string | null;
    resultAssetId: string | null;
    operation: "VIDEO_REFERENCE_TRANSFORM";
    promptSnapshot: string;
    paramsSnapshot: VideoReferenceTransformParams;
  };
  createdAt: string;
  updatedAt: string;
};

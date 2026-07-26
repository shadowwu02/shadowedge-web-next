export type ImageUpscaleStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type ImageUpscalePreviewStatus = "READY" | "BLOCKED" | "EXPIRED";

export type ImageUpscaleSource = {
  displayName?: string;
  height?: number | null;
  sourceAssetId?: string | null;
  sourceJobId?: string | null;
  url: string;
  width?: number | null;
};

export type ImageUpscalePreview = {
  boundary: string;
  costStatus: "VERIFIED" | "UNKNOWN";
  createdAt: string;
  estimatedCredits: number | null;
  estimatedDurationSeconds: { min: number; max: number; confidence: string };
  expiresAt: string;
  operation: "UPSCALE";
  output: { width: number | null; height: number | null };
  previewId: string;
  provider: { id: string; model: string | null; schemaVersion: string | null; status: string; ready: boolean };
  riskFlags: string[];
  scale: 2 | 4;
  source: ImageUpscaleSource;
  status: ImageUpscalePreviewStatus;
};

export type ImageUpscaleJob = {
  billingJobId: string | null;
  createdAt: string;
  creditsCharged: number;
  errorCode?: string;
  errorMessage?: string;
  estimatedCredits: number;
  lineage: {
    operation: "UPSCALE";
    sourceAssetId: string | null;
    sourceJobId: string | null;
    resultAssetId: string | null;
  };
  operation: "UPSCALE";
  operationId: string;
  output: { width: number | null; height: number | null };
  previewId: string;
  refunded: boolean;
  refundStatus: string;
  resultAssetId: string | null;
  resultUrl: string | null;
  scale: 2 | 4;
  source: ImageUpscaleSource;
  status: ImageUpscaleStatus;
  updatedAt: string;
};

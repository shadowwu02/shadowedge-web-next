import type { StudioCapabilityId } from "@/features/studio/capabilities/studioCapabilities";
import type { VideoJobIdentity } from "@/lib/video/videoJobIdentity";

export type ProviderJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type ProviderErrorCode =
  | "PROVIDER_AUTH_ERROR"
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_INVALID_INPUT"
  | "PROVIDER_JOB_NOT_FOUND"
  | "PROVIDER_TEMPORARY"
  | "PROVIDER_JOB_FAILED"
  | "PROVIDER_CANCELLED";

export type ProviderRuntimeErrorCode =
  | ProviderErrorCode
  | "CAPABILITY_PROVIDER_UNAVAILABLE"
  | "PROVIDER_EXECUTION_DISABLED"
  | "PROVIDER_COST_NOT_CONFIGURED"
  | "PROVIDER_JOB_ID_MISSING_AFTER_SUBMIT"
  | "SUBMISSION_PERSISTENCE_FAILED";

export type ProviderJobIdentity = VideoJobIdentity & {
  clientJobId: string;
  databaseJobId: string;
  providerJobId: string;
  statusJobId: string;
};

export type ProviderSubmitRequest = {
  capability: StudioCapabilityId;
  projectId: string | null;
  nodeId: string;
  mode?: string;
  payload: Record<string, unknown>;
};

export type ProviderCostEstimateStatus =
  | "VERIFIED"
  | "PARTIAL"
  | "QUOTE_ONLY"
  | "UNKNOWN";

export type ProviderCostEstimateRequest = {
  capability: StudioCapabilityId;
  modelId?: string;
  parameters: Record<string, unknown>;
};

export type ProviderCostEstimate = {
  providerId: string;
  capability: StudioCapabilityId;
  modelId: string | null;
  amount: number | null;
  currency: string;
  status: ProviderCostEstimateStatus;
  source: string;
};

export type ProviderJobResult = {
  identity: ProviderJobIdentity;
  status: ProviderJobStatus;
  output?: Record<string, unknown>;
  errorCode?: ProviderRuntimeErrorCode;
  message?: string;
  mock: boolean;
  providerCalled: boolean;
};

export type NormalizedProviderError = {
  code: ProviderRuntimeErrorCode;
  message: string;
  retryable: boolean;
  providerStatus?: number;
  rawCode?: string;
};

export interface ProviderAdapter {
  readonly key: string;
  readonly providerId: string;
  readonly kind: "mock" | "real";
  readonly capabilities: readonly StudioCapabilityId[];
  submit(request: ProviderSubmitRequest): Promise<ProviderJobResult>;
  status(identity: ProviderJobIdentity): Promise<ProviderJobResult>;
  cancel(identity: ProviderJobIdentity): Promise<ProviderJobResult>;
  normalizeError(error: unknown): NormalizedProviderError;
  estimateCost(
    request: ProviderCostEstimateRequest,
  ): ProviderCostEstimate | Promise<ProviderCostEstimate>;
}

type ErrorCandidate = {
  code?: unknown;
  errorCode?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

function normalizedRawCode(candidate: ErrorCandidate) {
  return String(candidate.code || candidate.errorCode || "")
    .trim()
    .toUpperCase();
}

export function normalizeProviderError(
  error: unknown,
  fallbackMessage = "The provider request failed.",
): NormalizedProviderError {
  const candidate = (error || {}) as ErrorCandidate;
  const rawCode = normalizedRawCode(candidate);
  const status = Number(candidate.status || candidate.statusCode) || undefined;
  const message =
    (typeof candidate.message === "string" && candidate.message.trim()) ||
    (error instanceof Error && error.message) ||
    fallbackMessage;

  let code: ProviderRuntimeErrorCode = "PROVIDER_JOB_FAILED";
  if (
    rawCode === "CAPABILITY_PROVIDER_UNAVAILABLE" ||
    rawCode === "PROVIDER_EXECUTION_DISABLED" ||
    rawCode === "PROVIDER_COST_NOT_CONFIGURED" ||
    rawCode === "PROVIDER_JOB_ID_MISSING_AFTER_SUBMIT" ||
    rawCode === "SUBMISSION_PERSISTENCE_FAILED"
  ) {
    code = rawCode;
  } else if (status === 401 || status === 403 || rawCode.includes("AUTH")) {
    code = "PROVIDER_AUTH_ERROR";
  } else if (status === 429 || rawCode.includes("RATE_LIMIT")) {
    code = "PROVIDER_RATE_LIMIT";
  } else if (
    status === 400 ||
    status === 422 ||
    rawCode.includes("INVALID_INPUT") ||
    rawCode.includes("PARAMETER")
  ) {
    code = "PROVIDER_INVALID_INPUT";
  } else if (status === 404 || rawCode.includes("JOB_NOT_FOUND")) {
    code = "PROVIDER_JOB_NOT_FOUND";
  } else if (
    rawCode.includes("CANCEL") ||
    rawCode === "ABORT_ERR" ||
    rawCode === "ABORTERROR"
  ) {
    code = "PROVIDER_CANCELLED";
  } else if (
    status === 408 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    rawCode.includes("TEMPORARY") ||
    rawCode.includes("TIMEOUT")
  ) {
    code = "PROVIDER_TEMPORARY";
  }

  return {
    code,
    message,
    retryable: code === "PROVIDER_RATE_LIMIT" || code === "PROVIDER_TEMPORARY",
    ...(status ? { providerStatus: status } : {}),
    ...(rawCode ? { rawCode } : {}),
  };
}

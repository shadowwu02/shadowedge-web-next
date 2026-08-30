import type { DictionaryKey } from "@/i18n/useI18n";

export type VideoErrorReasonCode = "material" | "parameter" | "policy" | "temporary" | "not_found" | "unknown";
export type VideoErrorTone = "warning" | "error" | "info";

export type VideoUserFacingErrorDisplay = {
  title: string;
  message: string;
  suggestion: string;
  tone: VideoErrorTone;
  reasonCode: VideoErrorReasonCode;
  canRetry: boolean;
  canRestoreDraft: boolean;
};

type VideoErrorTranslator = (key: DictionaryKey) => string;

const audioReferenceCustomerErrorKeys = {
  AUDIO_REFERENCE_ASSET_NOT_CANONICAL: "video.audioReference.error.reupload",
  AUDIO_REFERENCE_NOT_READY: "video.audioReference.error.notReady",
  AUDIO_REFERENCE_OWNER_MISMATCH: "video.audioReference.error.access",
  AUDIO_REFERENCE_TENANT_MISMATCH: "video.audioReference.error.access",
  AUDIO_REFERENCE_UNSUPPORTED_FORMAT: "video.audioReference.error.unsupportedFormat",
  AUDIO_REFERENCE_FORMAT_UNSUPPORTED: "video.audioReference.error.unsupportedFormat",
  AUDIO_REFERENCE_PROBE_FAILED: "video.audioReference.error.probeFailed",
  AUDIO_METADATA_PROBE_FAILED: "video.audioReference.error.probeFailed",
  AUDIO_METADATA_PROBE_INCOMPLETE: "video.audioReference.error.probeFailed",
  VIDEO_AUDIO_REFERENCE_REUPLOAD_REQUIRED: "video.audioReference.error.reupload",
  VIDEO_AUDIO_REFERENCE_NOT_READY: "video.audioReference.error.notReady",
  VIDEO_AUDIO_REFERENCE_ACCESS_DENIED: "video.audioReference.error.access",
  VIDEO_AUDIO_REFERENCE_UNSUPPORTED_FORMAT: "video.audioReference.error.unsupportedFormat",
  VIDEO_AUDIO_REFERENCE_VERIFICATION_FAILED: "video.audioReference.error.probeFailed",
  XINHANKR_ARTSDANCE_AUDIO_REFERENCE_COMBINATION_UNVERIFIED: "video.audioReference.error.unsupportedCombination",
} as const satisfies Record<string, DictionaryKey>;

export function getAudioReferenceCustomerErrorMessage(error: unknown, t: VideoErrorTranslator) {
  const record = error && typeof error === "object" ? error as { code?: unknown } : {};
  const code = String(record.code || "").trim().toUpperCase();
  const key = audioReferenceCustomerErrorKeys[code as keyof typeof audioReferenceCustomerErrorKeys];
  return key ? t(key) : "";
}

const providerCustomerErrorCodes = new Set([
  "XINHANKR_ARTSDANCE_PROVIDER_REJECTED",
  "POLICY_OR_COPYRIGHT",
  "VIDEO_CONTENT_POLICY_REJECTED",
  "VIDEO_CONTENT_REVIEW_FAILED",
  "PROVIDER_TEMPORARY",
  "PROVIDER_TEMPORARY_FAILURE",
  "VIDEO_SERVICE_TEMPORARY",
  "AUTH",
  "AUTH_FAILED",
  "XINHANKR_ARTSDANCE_AUTHENTICATION_FAILED",
  "VIDEO_SERVICE_AUTHORIZATION_UNAVAILABLE",
  "ENTITLEMENT",
  "VIDEO_SERVICE_ENTITLEMENT_UNAVAILABLE",
  "RESULT_INVALID",
  "VIDEO_RESULT_INVALID",
  "TIMEOUT_UNKNOWN",
  "PROVIDER_SUBMIT_UNCERTAIN",
  "VIDEO_STATUS_UNKNOWN",
  "PROVIDER_REQUEST_REJECTED",
  "VIDEO_REQUEST_NOT_PROCESSED",
]);

function errorRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function providerErrorPublicMessage(error: unknown) {
  const payload = errorRecord(errorRecord(error).payload);
  return String(payload.public_message || payload.publicMessage || "").trim();
}

export function getVideoProviderCustomerErrorMessage(error: unknown, t: VideoErrorTranslator) {
  const record = errorRecord(error);
  const code = String(record.code || "").trim().toUpperCase();
  if (!providerCustomerErrorCodes.has(code)) return "";
  return getVideoUserFacingErrorDisplay(String(record.message || ""), t, {
    errorCode: code,
    publicMessage: providerErrorPublicMessage(error),
  }).message;
}

type VideoErrorDisplayOptions = {
  classificationMessage?: string | null;
  context?: "remake" | "video";
  errorCode?: string | null;
  publicMessage?: string | null;
  refunded?: boolean;
  refundStatus?: string | null;
};

type ErrorCopyKeys = {
  title: DictionaryKey;
  message: DictionaryKey;
  suggestion: DictionaryKey;
  tone: VideoErrorTone;
  canRetry: boolean;
  canRestoreDraft: boolean;
};

const errorDisplayCopy: Record<VideoErrorReasonCode, ErrorCopyKeys> = {
  material: {
    title: "video.errorDisplay.material.title",
    message: "video.errorDisplay.material.message",
    suggestion: "video.errorDisplay.material.suggestion",
    tone: "warning",
    canRetry: true,
    canRestoreDraft: true,
  },
  parameter: {
    title: "video.errorDisplay.parameter.title",
    message: "video.errorDisplay.parameter.message",
    suggestion: "video.errorDisplay.parameter.suggestion",
    tone: "warning",
    canRetry: true,
    canRestoreDraft: true,
  },
  policy: {
    title: "video.errorDisplay.policy.title",
    message: "video.errorDisplay.policy.message",
    suggestion: "video.errorDisplay.policy.suggestion",
    tone: "warning",
    canRetry: true,
    canRestoreDraft: true,
  },
  temporary: {
    title: "video.errorDisplay.temporary.title",
    message: "video.errorDisplay.temporary.message",
    suggestion: "video.errorDisplay.temporary.suggestion",
    tone: "info",
    canRetry: true,
    canRestoreDraft: true,
  },
  not_found: {
    title: "video.errorDisplay.notFound.title",
    message: "video.errorDisplay.notFound.message",
    suggestion: "video.errorDisplay.notFound.suggestion",
    tone: "warning",
    canRetry: true,
    canRestoreDraft: true,
  },
  unknown: {
    title: "video.errorDisplay.unknown.title",
    message: "video.errorDisplay.unknown.message",
    suggestion: "video.errorDisplay.unknown.suggestion",
    tone: "error",
    canRetry: true,
    canRestoreDraft: true,
  },
};

const providerInternalErrorTerms = [
  "higgsfield",
  "provider",
  "internal",
  "replicate",
  "replicate api",
  "prediction",
  "predictions",
  "prediction failed",
  "model failed",
  "provider failed",
  "request was throttled",
  "rate limit",
  "upstream",
  "upstream error",
  "worker failed",
  "submit failed",
  "api error",
  "http 500",
  "ip detected",
  "ip check failed",
  "ip check",
  "cli",
  "spawn",
  "timeout",
  "invalid values:",
  "aspect_ratio",
  "enoent",
  "econnreset",
  "eai_again",
];

const rawDumpErrorTerms = [
  "failed {",
  "{\"error\"",
  "{ \"error\"",
  "\"status\":\"failed\"",
  "\"status\": \"failed\"",
  "status\":\"failed\"",
  "providerjobid",
  "provider_job_id",
  "stack",
  "trace",
  "stderr",
  "stdout",
  "exitcode",
  "exit code",
];

const materialErrorTerms = [
  "material_issue",
  "material issue",
  "material",
  "uploaded material could not be processed",
  "material processing issue",
  "media invalid",
  "invalid media",
  "image invalid",
  "invalid image",
  "video invalid",
  "invalid video",
  "unsupported format",
  "download failed",
  "file unreadable",
  "could not be processed",
  "asset not accessible",
  "asset not found",
  "content could not be processed",
  "cannot process media",
  "input media not found",
  "media input not found",
  "media not found",
  "reference media not found",
  "unable to process media",
];

const parameterErrorTerms = [
  "parameter_issue",
  "parameter issue",
  "invalid parameter",
  "invalid_duration",
  "invalid duration",
  "unsupported ratio",
  "unsupported resolution",
  "model_param_unsupported",
  "model does not support",
  "too many references",
  "missing prompt",
  "invalid values",
  "aspect_ratio=auto",
  "unknown parameter",
  "unsupported parameter",
  "reference limit",
  "max references",
  "too many reference",
  "duration too long",
  "video too long",
  "exceeds duration",
  "exceed duration",
];

const policyErrorTerms = [
  "policy_or_copyright",
  "policy",
  "copyright",
  "unsafe",
  "protected content",
  "content moderation",
  "safety",
  "blocked",
  "content_policy_rejected",
  "copyright_rejected",
  "copyright_confirmation_required",
  "face_ip_failed",
  "ip detected",
  "nsfw",
  "moderation",
  "content policy",
];

const temporaryErrorTerms = [
  "provider_temporary_failure",
  "temporary",
  "temporarily unavailable",
  "rate limit",
  "server error",
  "server 500",
  " 500",
  " 502",
  " 503",
  "network",
  "service unavailable",
  "provider timeout",
  "timeout",
  "socket hang up",
  "session expired",
  "auth failed",
  "failed to fetch",
  "econnreset",
  "eai_again",
];

const notFoundErrorTerms = [
  "video_job_not_found",
  "job not found",
  "task not found",
  "not found for this account",
  "status expired",
  "unable to check this job status",
];

function normalizeErrorMessage(message: string | null | undefined) {
  return String(message || "").trim();
}

function includesAnyTerm(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

export function isProviderInternalVideoError(message: string | null | undefined) {
  const normalized = normalizeErrorMessage(message).toLowerCase();
  if (!normalized) return false;
  return providerInternalErrorTerms.some((term) => normalized.includes(term)) || rawDumpErrorTerms.some((term) => normalized.includes(term));
}

function isSafePublicVideoErrorMessage(message: string | null | undefined) {
  const normalized = normalizeErrorMessage(message).toLowerCase();
  if (!normalized) return false;
  if (isProviderInternalVideoError(normalized)) return false;
  if (includesAnyTerm(normalized, ["media input not found", "input media not found", "provider", "raw params", "token"])) return false;
  return true;
}

export function getVideoErrorReasonCode(message: string | null | undefined, options: VideoErrorDisplayOptions = {}): VideoErrorReasonCode {
  const raw = normalizeErrorMessage(options.classificationMessage || message);
  const normalized = raw.toLowerCase();
  const errorCode = String(options.errorCode || "").toUpperCase();
  const combined = `${normalized} ${errorCode.toLowerCase()}`;

  if (
    errorCode === "POLICY_OR_COPYRIGHT" ||
    errorCode === "CONTENT_POLICY_REJECTED" ||
    errorCode === "COPYRIGHT_REJECTED" ||
    errorCode === "VIDEO_CONTENT_REVIEW_FAILED" ||
    includesAnyTerm(combined, policyErrorTerms)
  ) {
    return "policy";
  }

  if (
    errorCode === "XINHANKR_ARTSDANCE_PROVIDER_REJECTED" ||
    errorCode === "PROVIDER_REQUEST_REJECTED" ||
    errorCode === "VIDEO_REQUEST_NOT_PROCESSED"
  ) {
    return "unknown";
  }

  if (
    errorCode === "MATERIAL_ISSUE" ||
    errorCode === "MEDIA_INVALID" ||
    errorCode === "MEDIA_PROCESSING_FAILED" ||
    errorCode === "RESULT_INVALID" ||
    errorCode === "VIDEO_RESULT_INVALID" ||
    includesAnyTerm(combined, materialErrorTerms)
  ) {
    return "material";
  }

  if (
    errorCode === "PARAMETER_ISSUE" ||
    errorCode === "MODEL_PARAM_UNSUPPORTED" ||
    errorCode === "INVALID_PARAMETER" ||
    includesAnyTerm(combined, parameterErrorTerms)
  ) {
    return "parameter";
  }

  if (errorCode === "VIDEO_JOB_NOT_FOUND" || errorCode === "TASK_NOT_FOUND" || includesAnyTerm(combined, notFoundErrorTerms)) {
    return "not_found";
  }

  if (
    errorCode === "PROVIDER_TEMPORARY_FAILURE" ||
    errorCode === "PROVIDER_TEMPORARY" ||
    errorCode === "VIDEO_SERVICE_TEMPORARY" ||
    errorCode === "AUTH" ||
    errorCode === "AUTH_FAILED" ||
    errorCode === "XINHANKR_ARTSDANCE_AUTHENTICATION_FAILED" ||
    errorCode === "VIDEO_SERVICE_AUTHORIZATION_UNAVAILABLE" ||
    errorCode === "ENTITLEMENT" ||
    errorCode === "VIDEO_SERVICE_ENTITLEMENT_UNAVAILABLE" ||
    errorCode === "TIMEOUT_UNKNOWN" ||
    errorCode === "PROVIDER_SUBMIT_UNCERTAIN" ||
    errorCode === "VIDEO_STATUS_UNKNOWN" ||
    errorCode === "RATE_LIMITED" ||
    includesAnyTerm(combined, temporaryErrorTerms) ||
    isProviderInternalVideoError(raw)
  ) {
    return "temporary";
  }

  if (
    normalized.includes("not enough credits") ||
    normalized.includes("not enough credit") ||
    normalized.includes("insufficient credits") ||
    normalized.includes("insufficient credit") ||
    normalized.includes("purchase credit") ||
    normalized.includes("billing") ||
    normalized.includes("balance") ||
    normalized.includes("invalid prompt") ||
    normalized.includes("prompt is invalid") ||
    normalized.includes("prompt_too_long") ||
    normalized.includes("prompt is too long") ||
    normalized.includes("prompt too long") ||
    normalized.includes("file too large") ||
    normalized.includes("payload too large") ||
    normalized.includes("413") ||
    normalized.includes("unsupported reference")
  ) {
    return "parameter";
  }

  return "unknown";
}

export function getVideoUserFacingErrorDisplay(
  message: string | null | undefined,
  t: VideoErrorTranslator,
  options: VideoErrorDisplayOptions = {},
): VideoUserFacingErrorDisplay {
  const reasonCode = getVideoErrorReasonCode(message, options);
  const copy = errorDisplayCopy[reasonCode];
  const publicMessage = isSafePublicVideoErrorMessage(options.publicMessage) ? normalizeErrorMessage(options.publicMessage) : "";

  return {
    title: t(copy.title),
    message: publicMessage || t(copy.message),
    suggestion: t(copy.suggestion),
    tone: copy.tone,
    reasonCode,
    canRetry: copy.canRetry,
    canRestoreDraft: copy.canRestoreDraft,
  };
}

export function getVideoUserFacingError(message: string | null | undefined, t: VideoErrorTranslator, options: VideoErrorDisplayOptions = {}) {
  if (!normalizeErrorMessage(message)) return "";
  return getVideoUserFacingErrorDisplay(message, t, options).message;
}

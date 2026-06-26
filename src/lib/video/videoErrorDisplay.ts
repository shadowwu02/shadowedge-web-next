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

type VideoErrorDisplayOptions = {
  context?: "remake" | "video";
  errorCode?: string | null;
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
  "content could not be processed",
  "cannot process media",
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

export function getVideoErrorReasonCode(message: string | null | undefined, options: VideoErrorDisplayOptions = {}): VideoErrorReasonCode {
  const raw = normalizeErrorMessage(message);
  const normalized = raw.toLowerCase();
  const errorCode = String(options.errorCode || "").toUpperCase();
  const combined = `${normalized} ${errorCode.toLowerCase()}`;

  if (
    errorCode === "POLICY_OR_COPYRIGHT" ||
    errorCode === "CONTENT_POLICY_REJECTED" ||
    errorCode === "COPYRIGHT_REJECTED" ||
    includesAnyTerm(combined, policyErrorTerms)
  ) {
    return "policy";
  }

  if (
    errorCode === "MATERIAL_ISSUE" ||
    errorCode === "MEDIA_INVALID" ||
    errorCode === "MEDIA_PROCESSING_FAILED" ||
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

  return {
    title: t(copy.title),
    message: t(copy.message),
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

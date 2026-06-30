import type { DictionaryKey } from "@/i18n/useI18n";

export type ImageErrorReasonCode = "material" | "parameter" | "policy" | "temporary" | "not_found" | "unknown";
export type ImageErrorTone = "warning" | "error" | "info";

export type ImageUserFacingErrorDisplay = {
  title: string;
  message: string;
  suggestion: string;
  tone: ImageErrorTone;
  reasonCode: ImageErrorReasonCode;
  canRetry: boolean;
  canRestoreDraft: boolean;
};

type ImageErrorTranslator = (key: DictionaryKey) => string;
type ImageErrorDisplayOptions = {
  classificationMessage?: string | null;
  errorCode?: string | null;
  publicMessage?: string | null;
  refunded?: boolean;
  refundStatus?: string | null;
};

type ErrorCopyKeys = {
  title: DictionaryKey;
  message: DictionaryKey;
  suggestion: DictionaryKey;
  tone: ImageErrorTone;
  canRetry: boolean;
  canRestoreDraft: boolean;
};

const errorDisplayCopy: Record<ImageErrorReasonCode, ErrorCopyKeys> = {
  material: {
    title: "image.errorDisplay.material.title",
    message: "image.errorDisplay.material.message",
    suggestion: "image.errorDisplay.material.suggestion",
    tone: "warning",
    canRetry: true,
    canRestoreDraft: true,
  },
  parameter: {
    title: "image.errorDisplay.parameter.title",
    message: "image.errorDisplay.parameter.message",
    suggestion: "image.errorDisplay.parameter.suggestion",
    tone: "warning",
    canRetry: true,
    canRestoreDraft: true,
  },
  policy: {
    title: "image.errorDisplay.policy.title",
    message: "image.errorDisplay.policy.message",
    suggestion: "image.errorDisplay.policy.suggestion",
    tone: "warning",
    canRetry: true,
    canRestoreDraft: true,
  },
  temporary: {
    title: "image.errorDisplay.temporary.title",
    message: "image.errorDisplay.temporary.message",
    suggestion: "image.errorDisplay.temporary.suggestion",
    tone: "info",
    canRetry: true,
    canRestoreDraft: true,
  },
  not_found: {
    title: "image.errorDisplay.notFound.title",
    message: "image.errorDisplay.notFound.message",
    suggestion: "image.errorDisplay.notFound.suggestion",
    tone: "warning",
    canRetry: true,
    canRestoreDraft: true,
  },
  unknown: {
    title: "image.errorDisplay.unknown.title",
    message: "image.errorDisplay.unknown.message",
    suggestion: "image.errorDisplay.unknown.suggestion",
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
  "prediction",
  "prediction failed",
  "provider failed",
  "upstream",
  "worker failed",
  "submit failed",
  "api error",
  "http 500",
  "networkerror",
  "request was throttled",
  "rate limit",
  "ip check",
  "ip detected",
  "cli",
  "spawn",
  "timeout",
  "invalid values:",
  "aspect_ratio",
  "hf model",
];

const rawDumpErrorTerms = [
  "failed {",
  "{\"error\"",
  "{ \"error\"",
  "\"status\":\"failed\"",
  "\"status\": \"failed\"",
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
  "uploaded material could not be processed",
  "material processing issue",
  "media invalid",
  "invalid media",
  "image invalid",
  "invalid image",
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
  "model_param_unsupported",
  "model does not support",
  "invalid values",
  "aspect_ratio=auto",
  "unsupported ratio",
  "unsupported resolution",
  "unknown parameter",
  "unsupported parameter",
  "schema",
  "imagemedia",
  "field required",
  "enum error",
  "valid object",
  "reference limit",
  "max references",
  "too many reference",
  "missing prompt",
  "prompt required",
  "prompt_too_long",
  "prompt is too long",
  "prompt too long",
  "file too large",
  "payload too large",
  "413",
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
  "http 500",
  " 500",
  " 502",
  " 503",
  "network",
  "network error",
  "service unavailable",
  "provider timeout",
  "timeout",
  "socket hang up",
  "session expired",
  "auth failed",
  "fetch failed",
  "failed to fetch",
  "econnreset",
  "eai_again",
  "insufficient balance",
];

const notFoundErrorTerms = [
  "image_job_not_found",
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

export function isProviderInternalImageError(message: string | null | undefined) {
  const normalized = normalizeErrorMessage(message).toLowerCase();
  if (!normalized) return false;
  return providerInternalErrorTerms.some((term) => normalized.includes(term)) || rawDumpErrorTerms.some((term) => normalized.includes(term));
}

function isSafePublicImageErrorMessage(message: string | null | undefined) {
  const normalized = normalizeErrorMessage(message).toLowerCase();
  if (!normalized) return false;
  if (isProviderInternalImageError(normalized)) return false;
  if (includesAnyTerm(normalized, ["media input not found", "input media not found", "provider", "raw params", "token", "stderr", "stdout"])) return false;
  return true;
}

export function getImageErrorReasonCode(message: string | null | undefined, options: ImageErrorDisplayOptions = {}): ImageErrorReasonCode {
  const raw = normalizeErrorMessage(options.classificationMessage || message);
  const normalized = raw.toLowerCase();
  const errorCode = String(options.errorCode || "").toUpperCase();
  const combined = `${normalized} ${errorCode.toLowerCase()}`;

  if (
    errorCode === "POLICY" ||
    errorCode === "POLICY_OR_COPYRIGHT" ||
    errorCode === "CONTENT_POLICY_REJECTED" ||
    errorCode === "COPYRIGHT_REJECTED" ||
    includesAnyTerm(combined, policyErrorTerms)
  ) {
    return "policy";
  }

  if (
    errorCode === "MATERIAL" ||
    errorCode === "MATERIAL_ISSUE" ||
    errorCode === "MEDIA_INVALID" ||
    errorCode === "MEDIA_PROCESSING_FAILED" ||
    includesAnyTerm(combined, materialErrorTerms)
  ) {
    return "material";
  }

  if (
    errorCode === "PARAMETER" ||
    errorCode === "PARAMETER_ISSUE" ||
    errorCode === "MODEL_PARAM_UNSUPPORTED" ||
    errorCode === "INVALID_PARAMETER" ||
    includesAnyTerm(combined, parameterErrorTerms)
  ) {
    return "parameter";
  }

  if (errorCode === "NOT_FOUND" || errorCode === "IMAGE_JOB_NOT_FOUND" || errorCode === "TASK_NOT_FOUND" || includesAnyTerm(combined, notFoundErrorTerms)) {
    return "not_found";
  }

  if (
    errorCode === "TEMPORARY" ||
    errorCode === "PROVIDER_TEMPORARY_FAILURE" ||
    errorCode === "PROVIDER_TEMPORARY" ||
    errorCode === "RATE_LIMITED" ||
    includesAnyTerm(combined, temporaryErrorTerms) ||
    isProviderInternalImageError(raw)
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
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden") ||
    normalized.includes("401") ||
    normalized.includes("403") ||
    normalized.includes("invalid prompt") ||
    normalized.includes("prompt is invalid")
  ) {
    return "parameter";
  }

  return "unknown";
}

export function getImageUserFacingErrorDisplay(
  message: string | null | undefined,
  t: ImageErrorTranslator,
  options: ImageErrorDisplayOptions = {},
): ImageUserFacingErrorDisplay {
  const reasonCode = getImageErrorReasonCode(message, options);
  const copy = errorDisplayCopy[reasonCode];
  const publicMessage = isSafePublicImageErrorMessage(options.publicMessage) ? normalizeErrorMessage(options.publicMessage) : "";

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

export function getImageUserFacingError(message: string | null | undefined, t: ImageErrorTranslator, options: ImageErrorDisplayOptions = {}) {
  const raw = normalizeErrorMessage(message);
  if (!raw && !options.classificationMessage && !options.publicMessage) return "";
  const normalized = raw.toLowerCase();
  const hasStructuredFailureContext = Boolean(options.classificationMessage || options.publicMessage || options.errorCode);

  if (!hasStructuredFailureContext) {
    if (
      normalized.includes("not enough credits") ||
      normalized.includes("not enough credit") ||
      normalized.includes("insufficient credits") ||
      normalized.includes("insufficient credit") ||
      normalized.includes("purchase credit") ||
      normalized.includes("billing") ||
      normalized.includes("balance")
    ) {
      return t("image.errors.notEnoughCredits");
    }

    if (normalized.includes("unauthorized") || normalized.includes("forbidden") || normalized.includes("401") || normalized.includes("403")) {
      return t("image.errors.signInRequired");
    }

    if (normalized.includes("invalid prompt") || normalized.includes("prompt is invalid")) {
      return t("image.errors.invalidPrompt");
    }

    if (normalized.includes("prompt required") || normalized.includes("prompt is required") || normalized.includes("missing prompt")) {
      return t("image.errors.promptRequired");
    }

    if (normalized.includes("reference limit") || normalized.includes("max references") || normalized.includes("too many reference")) {
      return t("image.errors.referenceLimitReached");
    }

    if (normalized.includes("file too large") || normalized.includes("payload too large") || normalized.includes("413")) {
      return t("image.errors.fileTooLarge");
    }

    if (normalized.includes("unsupported format") || normalized.includes("unsupported file") || normalized.includes("unsupported image")) {
      return t("image.errors.unsupportedFormat");
    }
  }

  return getImageUserFacingErrorDisplay(raw, t, options).message;
}

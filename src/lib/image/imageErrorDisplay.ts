type ImageErrorKey =
  | "image.errors.fileTooLarge"
  | "image.errors.generationFailedNoRefund"
  | "image.errors.generationFailedFriendly"
  | "image.errors.invalidPrompt"
  | "image.errors.materialIssue"
  | "image.errors.materialIssueRefunded"
  | "image.errors.notEnoughCredits"
  | "image.errors.parameterIssue"
  | "image.errors.policyOrCopyright"
  | "image.errors.promptRequired"
  | "image.errors.providerTemporary"
  | "image.errors.referenceLimitReached"
  | "image.errors.signInRequired"
  | "image.errors.unsupportedFormat";

type ImageErrorTranslator = (key: ImageErrorKey) => string;
type ImageErrorDisplayOptions = {
  errorCode?: string | null;
  refunded?: boolean;
  refundStatus?: string | null;
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
  "fetch failed",
  "failed to fetch",
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

function normalizeErrorMessage(message: string | null | undefined) {
  return String(message || "").trim();
}

export function isProviderInternalImageError(message: string | null | undefined) {
  const normalized = normalizeErrorMessage(message).toLowerCase();
  if (!normalized) return false;
  return providerInternalErrorTerms.some((term) => normalized.includes(term)) || rawDumpErrorTerms.some((term) => normalized.includes(term));
}

export function getImageUserFacingError(message: string | null | undefined, t: ImageErrorTranslator, options: ImageErrorDisplayOptions = {}) {
  const raw = normalizeErrorMessage(message);
  if (!raw) return "";

  const normalized = raw.toLowerCase();
  const errorCode = String(options.errorCode || "").toUpperCase();
  const wasRefunded =
    options.refunded === true ||
    String(options.refundStatus || "").toLowerCase().includes("refund") ||
    normalized.includes("credits have been refunded") ||
    normalized.includes("credits were refunded") ||
    normalized.includes("积分已退回");

  if (
    errorCode === "MATERIAL_ISSUE" ||
    normalized.includes("material_issue") ||
    normalized.includes("uploaded material could not be processed") ||
    normalized.includes("material processing issue")
  ) {
    return wasRefunded ? t("image.errors.materialIssueRefunded") : t("image.errors.materialIssue");
  }

  if (
    errorCode === "POLICY_OR_COPYRIGHT" ||
    normalized.includes("policy_or_copyright") ||
    normalized.includes("content_policy_rejected") ||
    normalized.includes("copyright_rejected") ||
    normalized.includes("copyright_confirmation_required") ||
    normalized.includes("face_ip_failed") ||
    normalized.includes("ip detected") ||
    normalized.includes("nsfw") ||
    normalized.includes("moderation") ||
    normalized.includes("content policy")
  ) {
    return t("image.errors.policyOrCopyright");
  }

  if (
    errorCode === "PARAMETER_ISSUE" ||
    normalized.includes("parameter_issue") ||
    normalized.includes("invalid_duration") ||
    normalized.includes("model_param_unsupported") ||
    normalized.includes("invalid values") ||
    normalized.includes("aspect_ratio=auto") ||
    normalized.includes("unknown parameter") ||
    normalized.includes("unsupported parameter")
  ) {
    return t("image.errors.parameterIssue");
  }

  if (
    errorCode === "PROVIDER_TEMPORARY_FAILURE" ||
    normalized.includes("provider_temporary_failure") ||
    normalized.includes("server 500") ||
    normalized.includes("provider timeout") ||
    normalized.includes("network error") ||
    normalized.includes("socket hang up") ||
    normalized.includes("session expired") ||
    normalized.includes("auth failed") ||
    normalized.includes("insufficient balance")
  ) {
    return t("image.errors.providerTemporary");
  }

  if (errorCode === "PROVIDER_TASK_FAILED") {
    return t("image.errors.generationFailedNoRefund");
  }

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

  if (isProviderInternalImageError(raw)) {
    return t("image.errors.generationFailedFriendly");
  }

  return raw;
}

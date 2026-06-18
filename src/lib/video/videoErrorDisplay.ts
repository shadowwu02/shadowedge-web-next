type VideoErrorKey =
  | "video.errors.durationTooLong"
  | "video.errors.fileTooLarge"
  | "video.errors.generationFailedNoRefund"
  | "video.errors.generationFailedFriendly"
  | "video.errors.insufficientCredits"
  | "video.errors.invalidPrompt"
  | "video.errors.materialIssue"
  | "video.errors.materialIssueRefunded"
  | "video.errors.parameterIssue"
  | "video.errors.policyOrCopyright"
  | "video.errors.promptTooLong"
  | "video.errors.providerTemporary"
  | "video.errors.referenceLimitReached"
  | "video.errors.remakeShotFailedFriendly"
  | "video.errors.signInRequired"
  | "video.errors.unsupportedReference";

type VideoErrorTranslator = (key: VideoErrorKey) => string;

type VideoErrorDisplayOptions = {
  context?: "remake" | "video";
  errorCode?: string | null;
  refunded?: boolean;
  refundStatus?: string | null;
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

function normalizeErrorMessage(message: string | null | undefined) {
  return String(message || "").trim();
}

export function isProviderInternalVideoError(message: string | null | undefined) {
  const normalized = normalizeErrorMessage(message).toLowerCase();
  if (!normalized) return false;
  return providerInternalErrorTerms.some((term) => normalized.includes(term)) || rawDumpErrorTerms.some((term) => normalized.includes(term));
}

export function getVideoUserFacingError(message: string | null | undefined, t: VideoErrorTranslator, options: VideoErrorDisplayOptions = {}) {
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
    return wasRefunded ? t("video.errors.materialIssueRefunded") : t("video.errors.materialIssue");
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
    return t("video.errors.policyOrCopyright");
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
    return t("video.errors.parameterIssue");
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
    return t("video.errors.providerTemporary");
  }

  if (errorCode === "PROVIDER_TASK_FAILED") {
    return t("video.errors.generationFailedNoRefund");
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
    return t("video.errors.insufficientCredits");
  }

  if (normalized.includes("invalid prompt") || normalized.includes("prompt is invalid")) {
    return t("video.errors.invalidPrompt");
  }

  if (normalized.includes("prompt_too_long") || normalized.includes("prompt is too long") || normalized.includes("prompt too long")) {
    return t("video.errors.promptTooLong");
  }

  if (normalized.includes("reference limit") || normalized.includes("max references") || normalized.includes("too many reference")) {
    return t("video.errors.referenceLimitReached");
  }

  if (normalized.includes("unsupported format") || normalized.includes("unsupported reference")) {
    return t("video.errors.unsupportedReference");
  }

  if (normalized.includes("file too large") || normalized.includes("payload too large") || normalized.includes("413")) {
    return t("video.errors.fileTooLarge");
  }

  if (normalized.includes("duration too long") || normalized.includes("video too long") || normalized.includes("exceeds duration") || normalized.includes("exceed duration")) {
    return t("video.errors.durationTooLong");
  }

  if (normalized.includes("unauthorized") || normalized.includes("forbidden") || normalized.includes("401") || normalized.includes("403")) {
    return t("video.errors.signInRequired");
  }

  if (
    normalized.includes("video generation failed. please try again later") ||
    normalized === "video generation failed." ||
    normalized === "video generation failed" ||
    normalized.includes("generation failed. please try again later") ||
    normalized === "failed to fetch" ||
    isProviderInternalVideoError(raw)
  ) {
    return t(options.context === "remake" ? "video.errors.remakeShotFailedFriendly" : "video.errors.generationFailedFriendly");
  }

  return raw;
}

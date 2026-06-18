type VideoErrorKey =
  | "video.errors.durationTooLong"
  | "video.errors.fileTooLarge"
  | "video.errors.generationFailedFriendly"
  | "video.errors.insufficientCredits"
  | "video.errors.invalidPrompt"
  | "video.errors.materialIssueRefunded"
  | "video.errors.promptTooLong"
  | "video.errors.referenceLimitReached"
  | "video.errors.remakeShotFailedFriendly"
  | "video.errors.signInRequired"
  | "video.errors.unsupportedReference";

type VideoErrorTranslator = (key: VideoErrorKey) => string;

type VideoErrorDisplayOptions = {
  context?: "remake" | "video";
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

  if (
    normalized.includes("material_issue") ||
    normalized.includes("uploaded material could not be processed") ||
    normalized.includes("material processing issue")
  ) {
    return t("video.errors.materialIssueRefunded");
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

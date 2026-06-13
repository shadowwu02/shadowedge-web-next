type ImageErrorKey =
  | "image.errors.fileTooLarge"
  | "image.errors.generationFailedFriendly"
  | "image.errors.invalidPrompt"
  | "image.errors.notEnoughCredits"
  | "image.errors.promptRequired"
  | "image.errors.referenceLimitReached"
  | "image.errors.signInRequired"
  | "image.errors.unsupportedFormat";

type ImageErrorTranslator = (key: ImageErrorKey) => string;

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

export function getImageUserFacingError(message: string | null | undefined, t: ImageErrorTranslator) {
  const raw = normalizeErrorMessage(message);
  if (!raw) return "";

  const normalized = raw.toLowerCase();
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

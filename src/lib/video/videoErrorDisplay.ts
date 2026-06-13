type VideoErrorKey =
  | "video.errors.generationFailedFriendly"
  | "video.errors.insufficientCredits"
  | "video.errors.invalidPrompt"
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

function normalizeErrorMessage(message: string | null | undefined) {
  return String(message || "").trim();
}

export function isProviderInternalVideoError(message: string | null | undefined) {
  const normalized = normalizeErrorMessage(message).toLowerCase();
  if (!normalized) return false;
  return providerInternalErrorTerms.some((term) => normalized.includes(term));
}

export function getVideoUserFacingError(message: string | null | undefined, t: VideoErrorTranslator, options: VideoErrorDisplayOptions = {}) {
  const raw = normalizeErrorMessage(message);
  if (!raw) return "";

  const normalized = raw.toLowerCase();
  if (normalized.includes("not enough credits") || normalized.includes("insufficient credits")) {
    return t("video.errors.insufficientCredits");
  }

  if (normalized.includes("invalid prompt") || normalized.includes("prompt is invalid")) {
    return t("video.errors.invalidPrompt");
  }

  if (normalized.includes("reference limit") || normalized.includes("max references") || normalized.includes("too many reference")) {
    return t("video.errors.referenceLimitReached");
  }

  if (normalized.includes("unsupported format") || normalized.includes("unsupported reference")) {
    return t("video.errors.unsupportedReference");
  }

  if (normalized.includes("unauthorized") || normalized.includes("forbidden") || normalized.includes("401") || normalized.includes("403")) {
    return t("video.errors.signInRequired");
  }

  if (isProviderInternalVideoError(raw)) {
    return t(options.context === "remake" ? "video.errors.remakeShotFailedFriendly" : "video.errors.generationFailedFriendly");
  }

  return raw;
}

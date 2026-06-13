type ImageErrorKey =
  | "image.errors.generationFailedFriendly"
  | "image.errors.notEnoughCredits"
  | "image.errors.referenceLimitReached";

type ImageErrorTranslator = (key: ImageErrorKey) => string;

const providerInternalErrorTerms = [
  "higgsfield",
  "provider",
  "internal",
  "submit failed",
  "api error",
  "http 500",
  "ip check",
  "ip detected",
  "cli",
  "spawn",
  "timeout",
  "invalid values:",
  "aspect_ratio",
  "hf model",
];

function normalizeErrorMessage(message: string | null | undefined) {
  return String(message || "").trim();
}

export function isProviderInternalImageError(message: string | null | undefined) {
  const normalized = normalizeErrorMessage(message).toLowerCase();
  if (!normalized) return false;
  return providerInternalErrorTerms.some((term) => normalized.includes(term));
}

export function getImageUserFacingError(message: string | null | undefined, t: ImageErrorTranslator) {
  const raw = normalizeErrorMessage(message);
  if (!raw) return "";

  const normalized = raw.toLowerCase();
  if (normalized.includes("not enough credits") || normalized.includes("insufficient credits")) {
    return t("image.errors.notEnoughCredits");
  }

  if (normalized.includes("reference limit") || normalized.includes("max references") || normalized.includes("too many reference")) {
    return t("image.errors.referenceLimitReached");
  }

  if (isProviderInternalImageError(raw)) {
    return t("image.errors.generationFailedFriendly");
  }

  return raw;
}

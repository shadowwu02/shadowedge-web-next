function isStrictlyEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

// UX discovery only. Backend canonical admission, ownership and production
// limits remain authoritative in both authenticated and allowlist modes.
export const remakeFeatures = Object.freeze({
  longVideoUxEnabled: isStrictlyEnabled(process.env.NEXT_PUBLIC_REMAKE_LONG_VIDEO_UX_ENABLED),
});

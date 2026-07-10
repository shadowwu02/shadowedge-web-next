function isStrictlyEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

// Discovery only. Backend ownership, allowlist, and guard checks remain authoritative.
export const remakeFeatures = Object.freeze({
  longVideoUxEnabled: isStrictlyEnabled(process.env.NEXT_PUBLIC_REMAKE_LONG_VIDEO_UX_ENABLED),
});

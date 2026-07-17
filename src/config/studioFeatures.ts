function parseBooleanFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
}

const configuredImageExecution = parseBooleanFlag(
  process.env.NEXT_PUBLIC_STUDIO_IMAGE_EXECUTION_ENABLED,
);
const configuredVideoExecution = parseBooleanFlag(
  process.env.NEXT_PUBLIC_STUDIO_VIDEO_EXECUTION_ENABLED,
);
const configuredRemakeExecution = parseBooleanFlag(
  process.env.NEXT_PUBLIC_STUDIO_REMAKE_EXECUTION_ENABLED,
);

// Local development can exercise the executor without extra setup. Production
// builds remain off unless the public rollout flag is explicitly enabled.
export const STUDIO_IMAGE_EXECUTION_ENABLED =
  configuredImageExecution ?? process.env.NODE_ENV === "development";
export const STUDIO_VIDEO_EXECUTION_ENABLED =
  configuredVideoExecution ?? process.env.NODE_ENV === "development";
// Remake analysis can dispatch a paid VLM through the existing API. Keep it
// opt-in in every environment, including local development.
export const STUDIO_REMAKE_EXECUTION_ENABLED =
  configuredRemakeExecution ?? false;

export const studioFeatures = Object.freeze({
  imageExecutionEnabled: STUDIO_IMAGE_EXECUTION_ENABLED,
  videoExecutionEnabled: STUDIO_VIDEO_EXECUTION_ENABLED,
  remakeExecutionEnabled: STUDIO_REMAKE_EXECUTION_ENABLED,
});

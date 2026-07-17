function parseBooleanFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
}

const configuredImageExecution = parseBooleanFlag(
  process.env.NEXT_PUBLIC_STUDIO_IMAGE_EXECUTION_ENABLED,
);

// Local development can exercise the executor without extra setup. Production
// builds remain off unless the public rollout flag is explicitly enabled.
export const STUDIO_IMAGE_EXECUTION_ENABLED =
  configuredImageExecution ?? process.env.NODE_ENV === "development";

export const studioFeatures = Object.freeze({
  imageExecutionEnabled: STUDIO_IMAGE_EXECUTION_ENABLED,
});

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
const configuredGenerationOrchestrator = parseBooleanFlag(
  process.env.NEXT_PUBLIC_STUDIO_GENERATION_ORCHESTRATOR_ENABLED,
);
const configuredRemakeExecution = parseBooleanFlag(
  process.env.NEXT_PUBLIC_STUDIO_REMAKE_EXECUTION_ENABLED,
);
const configuredRender = parseBooleanFlag(
  process.env.NEXT_PUBLIC_STUDIO_RENDER_ENABLED,
);
const configuredVideoEdit = parseBooleanFlag(
  process.env.NEXT_PUBLIC_STUDIO_VIDEO_EDIT_ENABLED,
);
const configuredVideoEditExecution = parseBooleanFlag(
  process.env.NEXT_PUBLIC_STUDIO_VIDEO_EDIT_EXECUTION_ENABLED,
);
const configuredMotionControlExecution = parseBooleanFlag(
  process.env.NEXT_PUBLIC_STUDIO_MOTION_CONTROL_EXECUTION_ENABLED,
);
const configuredMotionProvider = parseBooleanFlag(
  process.env.NEXT_PUBLIC_STUDIO_MOTION_PROVIDER_ENABLED,
);
const configuredProviderExecution = parseBooleanFlag(
  process.env.NEXT_PUBLIC_STUDIO_PROVIDER_EXECUTION_ENABLED,
);
const configuredHiggsfieldVideoEdit = parseBooleanFlag(
  process.env.NEXT_PUBLIC_HIGGSFIELD_VIDEO_EDIT_ENABLED,
);
const configuredStudioHiggsfieldVideoGeneration = parseBooleanFlag(
  process.env.NEXT_PUBLIC_STUDIO_HIGGSFIELD_VIDEO_GENERATION_ENABLED,
);

// Local development can exercise the executor without extra setup. Production
// builds remain off unless the public rollout flag is explicitly enabled.
export const STUDIO_IMAGE_EXECUTION_ENABLED =
  configuredImageExecution ?? process.env.NODE_ENV === "development";
export const STUDIO_VIDEO_EXECUTION_ENABLED =
  configuredVideoExecution ?? process.env.NODE_ENV === "development";
// A Generation Plan can dispatch several paid video jobs. Keep the
// orchestrator opt-in in every environment, including local development.
export const STUDIO_GENERATION_ORCHESTRATOR_ENABLED =
  configuredGenerationOrchestrator ?? false;
// Remake analysis can dispatch a paid VLM through the existing API. Keep it
// opt-in in every environment, including local development.
export const STUDIO_REMAKE_EXECUTION_ENABLED =
  configuredRemakeExecution ?? false;
// Rendering uses user-owned Timeline media and an asynchronous FFmpeg worker.
// Keep production rollout opt-in while allowing local integration testing.
export const STUDIO_RENDER_ENABLED =
  configuredRender ?? process.env.NODE_ENV === "development";
// This flag reserves the future provider execution boundary. The P1-A5 node
// remains a local pass-through mock and never dispatches provider work.
export const STUDIO_VIDEO_EDIT_ENABLED = configuredVideoEdit ?? false;
// Real edit adapters remain fail-closed. P2-A1 only registers a local mock
// adapter, so toggling this flag cannot dispatch provider work yet.
export const STUDIO_VIDEO_EDIT_EXECUTION_ENABLED =
  configuredVideoEditExecution ?? false;
// P2-A2 only registers a local mock adapter. Real motion providers remain
// unavailable even if this future rollout gate is explicitly enabled.
export const STUDIO_MOTION_CONTROL_EXECUTION_ENABLED =
  configuredMotionControlExecution ?? false;
// Provider-backed Motion Control is a separate rollout boundary from the
// local mock node. It remains off in every environment unless explicitly set.
export const STUDIO_MOTION_PROVIDER_ENABLED =
  configuredMotionProvider ?? false;
// Provider-neutral Studio adapters fail closed. Local mocks remain available
// for contract validation because they have no network or billing path.
export const STUDIO_PROVIDER_EXECUTION_ENABLED =
  configuredProviderExecution ?? false;
// Dedicated provider gate. Limits and cost readiness are checked separately,
// so this flag cannot enable Higgsfield Video Edit by itself.
export const HIGGSFIELD_VIDEO_EDIT_ENABLED =
  configuredHiggsfieldVideoEdit ?? false;
// Studio uses the existing paid Video API, but selecting Higgsfield runtime
// models remains an explicit rollout decision in every environment.
export const STUDIO_HIGGSFIELD_VIDEO_GENERATION_ENABLED =
  configuredStudioHiggsfieldVideoGeneration ?? false;

export const studioFeatures = Object.freeze({
  imageExecutionEnabled: STUDIO_IMAGE_EXECUTION_ENABLED,
  videoExecutionEnabled: STUDIO_VIDEO_EXECUTION_ENABLED,
  generationOrchestratorEnabled: STUDIO_GENERATION_ORCHESTRATOR_ENABLED,
  remakeExecutionEnabled: STUDIO_REMAKE_EXECUTION_ENABLED,
  renderEnabled: STUDIO_RENDER_ENABLED,
  videoEditEnabled: STUDIO_VIDEO_EDIT_ENABLED,
  videoEditExecutionEnabled: STUDIO_VIDEO_EDIT_EXECUTION_ENABLED,
  motionControlExecutionEnabled: STUDIO_MOTION_CONTROL_EXECUTION_ENABLED,
  motionProviderEnabled: STUDIO_MOTION_PROVIDER_ENABLED,
  providerExecutionEnabled: STUDIO_PROVIDER_EXECUTION_ENABLED,
  higgsfieldVideoEditEnabled: HIGGSFIELD_VIDEO_EDIT_ENABLED,
  higgsfieldVideoGenerationEnabled:
    STUDIO_HIGGSFIELD_VIDEO_GENERATION_ENABLED,
});

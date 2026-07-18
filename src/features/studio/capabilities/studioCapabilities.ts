export type StudioCapabilityId =
  | "video_generate"
  | "video_edit"
  | "motion_control"
  | "camera_control";

export type StudioCapabilityCategory = "generation" | "edit" | "control";
export type StudioCapabilityMedia =
  | "text"
  | "image"
  | "video"
  | "character"
  | "motion_reference";

export type StudioCapabilityParameter = {
  key: string;
  type: "string" | "number" | "boolean" | "enum";
  required: boolean;
  values?: readonly string[];
};

export type StudioCapabilityProvider = {
  providerKey: string;
  adapterKey: string;
  availability: "available" | "mock" | "metadata_only";
  supportedModes: readonly string[];
  supportedParameters: readonly string[];
};

export type StudioCapability = {
  id: StudioCapabilityId;
  category: StudioCapabilityCategory;
  inputs: readonly StudioCapabilityMedia[];
  outputs: readonly StudioCapabilityMedia[];
  modes: readonly string[];
  parameters: readonly StudioCapabilityParameter[];
  providers: readonly StudioCapabilityProvider[];
};

export type CapabilityCostRule = {
  capability: StudioCapabilityId;
  providerKey: string;
  creditsRule: "existing_video_rules" | "free_mock" | "future";
};

const cameraPresets = [
  "dolly",
  "crane",
  "orbit",
  "handheld",
  "pan",
  "tilt",
  "zoom",
] as const;

export const CAMERA_CONTROL_PRESETS = cameraPresets;

export const STUDIO_CAPABILITIES = [
  {
    id: "video_generate",
    category: "generation",
    inputs: ["text", "image", "video"],
    outputs: ["video"],
    modes: ["text_to_video", "image_to_video", "reference_video"],
    parameters: [
      { key: "model", type: "string", required: true },
      { key: "duration", type: "number", required: true },
      { key: "ratio", type: "string", required: true },
      { key: "resolution", type: "string", required: false },
    ],
    providers: [
      {
        providerKey: "shadowedge_video_api",
        adapterKey: "existing_video_executor",
        availability: "available",
        supportedModes: ["text_to_video", "image_to_video", "reference_video"],
        supportedParameters: ["model", "duration", "ratio", "resolution"],
      },
    ],
  },
  {
    id: "video_edit",
    category: "edit",
    inputs: ["video", "text", "image", "character"],
    outputs: ["video"],
    modes: ["video_to_video", "replace_background", "extend"],
    parameters: [
      { key: "mode", type: "enum", required: true, values: ["video_to_video", "replace_background", "extend"] },
      { key: "prompt", type: "string", required: false },
      { key: "strength", type: "number", required: false },
    ],
    providers: [
      {
        providerKey: "mock",
        adapterKey: "mock_video_edit",
        availability: "mock",
        supportedModes: ["video_to_video", "replace_background", "extend"],
        supportedParameters: ["mode", "prompt", "strength"],
      },
      {
        providerKey: "higgsfield",
        adapterKey: "unavailable",
        availability: "metadata_only",
        supportedModes: ["video_to_video", "replace_background", "extend"],
        supportedParameters: ["mode", "prompt"],
      },
      {
        providerKey: "kling",
        adapterKey: "unavailable",
        availability: "metadata_only",
        supportedModes: ["video_to_video", "replace_background", "extend"],
        supportedParameters: ["mode", "prompt"],
      },
    ],
  },
  {
    id: "motion_control",
    category: "control",
    inputs: ["character", "image", "motion_reference", "text"],
    outputs: ["video"],
    modes: ["character_motion", "motion_transfer", "camera_motion"],
    parameters: [
      { key: "mode", type: "enum", required: true, values: ["character_motion", "motion_transfer", "camera_motion"] },
      { key: "prompt", type: "string", required: false },
      { key: "sceneSource", type: "enum", required: false, values: ["character", "motion_video"] },
      { key: "orientationSource", type: "enum", required: false, values: ["character", "motion_video"] },
    ],
    providers: [
      {
        providerKey: "mock",
        adapterKey: "mock_motion_control",
        availability: "mock",
        supportedModes: ["character_motion", "motion_transfer", "camera_motion"],
        supportedParameters: ["mode", "prompt"],
      },
      {
        providerKey: "higgsfield",
        adapterKey: "unavailable",
        availability: "metadata_only",
        supportedModes: ["character_motion", "motion_transfer", "camera_motion"],
        supportedParameters: ["mode", "prompt", "sceneSource", "orientationSource"],
      },
      {
        providerKey: "kling",
        adapterKey: "unavailable",
        availability: "metadata_only",
        supportedModes: ["character_motion", "motion_transfer", "camera_motion"],
        supportedParameters: ["mode", "prompt", "sceneSource", "orientationSource"],
      },
    ],
  },
  {
    id: "camera_control",
    category: "control",
    inputs: ["image", "character", "text"],
    outputs: ["video"],
    modes: ["preset", "prompt"],
    parameters: [
      { key: "preset", type: "enum", required: true, values: cameraPresets },
      { key: "prompt", type: "string", required: false },
      { key: "duration", type: "number", required: true },
      { key: "strength", type: "number", required: false },
    ],
    providers: [
      {
        providerKey: "mock",
        adapterKey: "mock_camera_control",
        availability: "mock",
        supportedModes: ["preset", "prompt"],
        supportedParameters: ["preset", "prompt", "duration", "strength"],
      },
      {
        providerKey: "higgsfield",
        adapterKey: "unavailable",
        availability: "metadata_only",
        supportedModes: ["preset", "prompt"],
        supportedParameters: ["preset", "prompt", "duration"],
      },
      {
        providerKey: "kling",
        adapterKey: "unavailable",
        availability: "metadata_only",
        supportedModes: ["prompt"],
        supportedParameters: ["prompt", "duration"],
      },
    ],
  },
] as const satisfies readonly StudioCapability[];

export const STUDIO_CAPABILITY_COST_RULES = [
  { capability: "video_generate", providerKey: "shadowedge_video_api", creditsRule: "existing_video_rules" },
  { capability: "video_edit", providerKey: "mock", creditsRule: "free_mock" },
  { capability: "motion_control", providerKey: "mock", creditsRule: "free_mock" },
  { capability: "camera_control", providerKey: "mock", creditsRule: "free_mock" },
  { capability: "video_edit", providerKey: "higgsfield", creditsRule: "future" },
  { capability: "motion_control", providerKey: "higgsfield", creditsRule: "future" },
  { capability: "camera_control", providerKey: "higgsfield", creditsRule: "future" },
] as const satisfies readonly CapabilityCostRule[];

export function getStudioCapability(id: StudioCapabilityId) {
  return STUDIO_CAPABILITIES.find((capability) => capability.id === id);
}

export function getStudioCapabilityProvider(
  capabilityId: StudioCapabilityId,
  providerKey: string,
) {
  return getStudioCapability(capabilityId)?.providers.find(
    (provider) => provider.providerKey === providerKey,
  );
}

export function providerSupportsCapabilityMode(
  capabilityId: StudioCapabilityId,
  providerKey: string,
  mode: string,
) {
  const provider = getStudioCapabilityProvider(capabilityId, providerKey);
  return Boolean(
    provider && (provider.supportedModes as readonly string[]).includes(mode),
  );
}

export function getCapabilityCostRule(
  capabilityId: StudioCapabilityId,
  providerKey: string,
) {
  return STUDIO_CAPABILITY_COST_RULES.find(
    (rule) => rule.capability === capabilityId && rule.providerKey === providerKey,
  );
}

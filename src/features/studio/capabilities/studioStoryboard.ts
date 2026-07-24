export const STUDIO_CREATIVE_SHOT_TYPES = [
  "WIDE_SHOT",
  "MEDIUM_SHOT",
  "CLOSE_UP",
  "TRACKING_SHOT",
  "ACTION_SHOT",
] as const;

export type StudioCreativeShotType = typeof STUDIO_CREATIVE_SHOT_TYPES[number];

export type StudioCreativeShot = Readonly<{
  shotId: string;
  sceneId: string;
  shotType: StudioCreativeShotType;
  description: string;
  camera: string;
  duration: number;
  references: readonly string[];
  promptDraft: Readonly<{
    text: string;
    status: "DRAFT";
    requiresConfirmation: true;
  }>;
  timelinePlaceholder: Readonly<{
    placeholderId: string;
    sourceClipId: string | null;
    start: number;
    duration: number;
    status: "REFERENCE_ONLY";
  }>;
  createdAt: string;
}>;

export type StudioCreativeStoryboard = Readonly<{
  storyboardId: string;
  projectId: string;
  sceneId: string;
  sceneName: string;
  shots: readonly StudioCreativeShot[];
  agentSource: string;
  status: "DRAFT";
  createdAt: string;
}>;

export type StudioStoryboardBundle = Readonly<{
  projectId: string;
  storyboards: readonly StudioCreativeStoryboard[];
  generatedAt: string;
  mode: "READ_ONLY_PLANNING";
  flow: "SCENE_TO_STORYBOARD_TO_SHOT_TO_TIMELINE_PLACEHOLDER";
}>;

export type StudioSceneShots = Readonly<{
  sceneId: string;
  storyboardId: string;
  shots: readonly StudioCreativeShot[];
  agentSource: string;
  mode: "READ_ONLY_PLANNING";
}>;

export type StudioShotDraft = Readonly<{
  draftId: string;
  draftType: "SHOT_DRAFT";
  storyboardId: string;
  sceneId: string;
  shotId: string;
  status: "PREVIEWED" | "CONFIRMED";
  reason: string;
  impact: "TIMELINE_PLACEHOLDER_REFERENCE_ONLY";
  proposal: Readonly<{
    description: string;
    camera: string;
    duration: number;
    references: readonly string[];
    prompt: string;
  }>;
  requiresConfirmation: true;
  createdAt: string;
  updatedAt?: string;
}>;

export type StudioShotGenerationReference = Readonly<{
  referenceId: string;
  type: "CHARACTER" | "STYLE" | "IMAGE" | "VIDEO";
  binding: "REFERENCE_ONLY";
}>;

export type StudioShotGenerationDraft = Readonly<{
  draftId: string;
  shotId: string;
  projectId: string;
  actionType: "SHOT_GENERATION_DRAFT";
  prompt: string;
  modelSuggestion: Readonly<{
    providerId: string;
    modelId: string;
    displayName: string;
    reason: string;
    availability: "AVAILABLE" | "BETA";
    verifiedScope: string;
    costStatus: "VERIFIED" | "PARTIAL" | "QUOTE_ONLY";
  }>;
  references: readonly StudioShotGenerationReference[];
  parameters: Readonly<{
    duration: number;
    resolution: string;
    ratio: string;
    audio: false;
    mode: string;
  }>;
  estimatedCost: Readonly<{
    shadowCredits: number;
    status: "VERIFIED" | "PARTIAL" | "QUOTE_ONLY";
    kind: "CONFIRMED" | "ESTIMATED";
  }>;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  status: "PREVIEWED" | "CONFIRMED";
  requiresConfirmation: true;
  selectionMode: "USER_CONFIRMATION_REQUIRED";
  workflowDraft?: Readonly<{
    type: "EXISTING_VIDEO_WORKFLOW_DRAFT";
    status: "DRAFT";
    requiresExecutionConfirm: true;
    executionStarted: false;
  }>;
  createdAt: string;
  updatedAt?: string;
}>;

export function studioShotTypeLabel(type: StudioCreativeShotType) {
  return type.replaceAll("_", " ").toLowerCase().replace(/^\w/, (value) => value.toUpperCase());
}

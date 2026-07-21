import type { StudioModelRecommendation } from "./studioModelRecommendation.ts";

export type StudioCreativeIntentType =
  | "CREATE_VIDEO"
  | "EDIT_VIDEO"
  | "TRANSFER_MOTION"
  | "CREATE_CHARACTER"
  | "CAMERA_EFFECT"
  | "UNKNOWN";

export type StudioUserCreativeIntent = {
  intentId: string;
  intentType: StudioCreativeIntentType;
  capabilities: string[];
  constraints: {
    duration: number | null;
    ratio: string;
    resolution: string;
    audio: boolean | null;
    mode: string;
    referenceMedia: string[];
  };
  confidence: number;
  createdAt: string;
};

export type StudioCapabilityIntentResolution = {
  intent: StudioUserCreativeIntent;
  capability: {
    capabilityId: string;
    name: string;
    status: string;
    providers: Array<{ providerId: string }>;
    models: Array<{ providerId: string; modelId: string }>;
    compatibleScopes: Array<Record<string, unknown>>;
  } | null;
  recommendations: StudioModelRecommendation;
  blockers: string[];
  detectionSignal: string;
  selectionMode: "USER_CONFIRMATION_REQUIRED";
  executionMode: "READ_ONLY_NO_GENERATION";
  analyticsTracking: "RECORDED" | "UNAVAILABLE";
};

export const STUDIO_CREATIVE_CAPABILITY_CHOICES = Object.freeze([
  { capabilityId: "video_generate", label: "Video Generation", example: "Generate a cinematic scene" },
  { capabilityId: "motion_control", label: "Character Motion", example: "Make a photo character dance" },
  { capabilityId: "video_edit", label: "Video Edit", example: "Restyle or change an existing clip" },
  { capabilityId: "camera_control", label: "Camera Effect", example: "Add an orbit or dolly move" }
]);

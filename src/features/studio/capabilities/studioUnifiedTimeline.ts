export const STUDIO_CREATIVE_TIMELINE_CLIP_TYPES = [
  "VIDEO_CLIP",
  "IMAGE_CLIP",
  "AUDIO_CLIP",
  "SUBTITLE_CLIP",
  "SCENE_MARKER",
] as const;

export type StudioCreativeTimelineClipType = typeof STUDIO_CREATIVE_TIMELINE_CLIP_TYPES[number];

export type StudioCreativeTimelineClip = Readonly<{
  clipId: string;
  projectId: string;
  type: StudioCreativeTimelineClipType;
  sourceRef: string;
  start: number;
  duration: number;
  metadata: Readonly<{
    label: string;
    trackId?: string;
    assetRef?: string | null;
    canvasNodeId?: string | null;
    executionId?: string | null;
    outputRef?: string | null;
    outputUrl?: string | null;
    assetStatus?: string | null;
    qualityStatus?: string | null;
    agentOrigin?: string | null;
    text?: string | null;
    sceneId?: string;
  }>;
  createdAt: string;
}>;

export type StudioCreativeScene = Readonly<{
  sceneId: string;
  projectId: string;
  name: string;
  clips: readonly StudioCreativeTimelineClip[];
  agents: readonly string[];
  createdAt: string;
}>;

export type StudioCanvasTimelineBinding = Readonly<{
  canvasNodeId: string;
  sceneId: string;
  clipId: string;
  createdAt: string;
}>;

export type StudioTimelineInsight = Readonly<{
  insightId: string;
  type: string;
  severity: string;
  message: string;
  confidence: string;
  sceneId: string | null;
  action: "DRAFT_SUGGESTION_ONLY";
}>;

export type StudioUnifiedTimeline = Readonly<{
  projectId: string;
  clips: readonly StudioCreativeTimelineClip[];
  bindings: readonly StudioCanvasTimelineBinding[];
  insights: readonly StudioTimelineInsight[];
  duration: number;
  generatedAt: string;
  mode: "READ_ONLY";
  sourceOfTruth: "STUDIO_TIMELINE";
}>;

export type StudioCreativeScenes = Readonly<{
  projectId: string;
  scenes: readonly StudioCreativeScene[];
  bindings: readonly StudioCanvasTimelineBinding[];
  generatedAt: string;
  mode: "READ_ONLY";
  sourceOfTruth: "STUDIO_TIMELINE";
}>;

export function studioTimelineClipLabel(type: StudioCreativeTimelineClipType) {
  return {
    VIDEO_CLIP: "Video",
    IMAGE_CLIP: "Image",
    AUDIO_CLIP: "Audio",
    SUBTITLE_CLIP: "Subtitle",
    SCENE_MARKER: "Scene",
  }[type];
}

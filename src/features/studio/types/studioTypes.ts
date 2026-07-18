import type { Edge, Node, Viewport } from "@xyflow/react";
import type { VideoJobIdentity } from "@/lib/video/videoJobIdentity";

export type StudioNodeType =
  | "asset"
  | "prompt"
  | "remakeAnalysis"
  | "remake_pipeline"
  | "remakeShot"
  | "imageGenerate"
  | "videoGenerate"
  | "video_edit"
  | "motion_control"
  | "output";

export type AssetType = "image" | "video" | "audio";
export type AssetStatus = "ready" | "missing" | "processing";
export type StudioAssetSource =
  | "upload"
  | "history"
  | "generated"
  | "rendered"
  | "remake";
export type GenerationNodeStatus = "idle" | "ready" | "queued" | "processing" | "completed" | "failed";
export type StudioGenerationQueueItemStatus =
  | "draft"
  | "waiting"
  | "queued"
  | "running"
  | "processing"
  | "completed"
  | "failed";
export type OutputType = "image" | "video" | "audio";

type StudioNodeBase = {
  title: string;
};

export type AssetNodeData = StudioNodeBase & {
  kind: "asset";
  assetId: string;
  assetType: AssetType;
  originNodeId: string;
  status: AssetStatus;
  url: string;
  thumbnail?: string;
  source: StudioAssetSource;
  metadata: Record<string, unknown>;
};

export type StudioAssetItem = {
  id: string;
  type: AssetType;
  name: string;
  url: string;
  thumbnail?: string;
  source: StudioAssetSource;
  createdAt?: string;
  status: AssetStatus;
  metadata: Record<string, unknown>;
};

export type PromptNodeData = StudioNodeBase & {
  kind: "prompt";
  prompt: string;
  style: string;
  camera: string;
  duration: number;
  ratio: string;
};

export type RemakeAnalysisNodeData = StudioNodeBase & {
  kind: "remakeAnalysis";
  videoInput: string;
  mode: "single_clip";
  targetRegion: "US" | "Middle East" | "Japan" | "Southeast Asia";
  targetRatio: string;
  characterRules: string;
  sceneStyle: string;
  translateDialogue: boolean;
  status: GenerationNodeStatus;
  storyboardId: string;
  analysisSource: string;
  shotCount: number;
  providerCallMade: boolean;
  vlmCalled: boolean;
  errorCode: string;
  errorMessage: string;
};

export type RemakePipelineNodeData = StudioNodeBase & {
  kind: "remakePipeline";
  sourceVideo: {
    assetId: string;
    sourceNodeId: string;
    url: string;
    thumbnail: string;
  } | null;
  analysisNodeId: string;
  status: GenerationNodeStatus;
  shotCount: number;
  videoNodeCount: number;
  timelineClipCount: number;
  shotNodeIds: string[];
  videoNodeIds: string[];
  timelineClipIds: string[];
  confirmationState: "none" | "awaiting" | "confirmed" | "cancelled";
  generationPlanId: string;
  estimatedCredits: number;
  generationStarted: boolean;
  providerCallMade: boolean;
  errorCode: string;
  errorMessage: string;
};

export type RemakeShotNodeData = StudioNodeBase & {
  kind: "remakeShot";
  analysisNodeId: string;
  storyboardId: string;
  shotId: string;
  shotNumber: number;
  description: string;
  prompt: string;
  duration: number;
  camera: string;
  referenceFrames: string[];
  sourceTimeRange: {
    start: number;
    end: number;
  };
  model: string;
  ratio: string;
  quality: string;
  status: GenerationNodeStatus;
};

export type ImageGenerateNodeData = StudioNodeBase & {
  kind: "imageGenerate";
  model: string;
  ratio: string;
  quality: string;
  size: string;
  count: number;
  promptInput: string;
  assetInput: string;
  status: GenerationNodeStatus;
  result: string;
  jobId: string;
  imageUrl: string;
  thumbnail: string;
  errorCode: string;
  errorMessage: string;
};

export type VideoGenerateNodeData = StudioNodeBase & {
  kind: "videoGenerate";
  model: string;
  duration: number;
  ratio: string;
  quality: string;
  resolution: string;
  references: string[];
  promptInput: string;
  imageInput: string;
  videoInput: string;
  status: GenerationNodeStatus;
  result: string;
  jobId: string;
  databaseJobId?: string;
  providerJobId?: string;
  statusJobId?: string;
  jobIdentity?: VideoJobIdentity;
  videoUrl: string;
  thumbnail: string;
  errorCode: string;
  errorMessage: string;
  sourceShotId: string;
  sourcePipelineId: string;
  pipelineExecutionBlocked: boolean;
  generationPlanId: string;
  queueStatus: StudioGenerationQueueItemStatus | null;
  timelineBound: boolean;
  timelineBindError: string;
};

export type VideoEditMode =
  | "video_to_video"
  | "replace_background"
  | "extend";

export type VideoEditAssetRef = {
  assetId: string;
  sourceNodeId: string;
  url: string;
  thumbnail: string;
};

export type VideoEditParameters = {
  strength?: number;
  preserveMotion?: boolean;
  extendSeconds?: number;
};

export type VideoEditNodeData = StudioNodeBase & {
  kind: "videoEdit";
  sourceVideo: VideoEditAssetRef | null;
  mode: VideoEditMode;
  prompt: string;
  parameters: VideoEditParameters;
  status: GenerationNodeStatus;
  generationPlanId: string;
  queueStatus: StudioGenerationQueueItemStatus | null;
  jobIdentity: (VideoJobIdentity & { clientJobId: string }) | null;
  result: {
    videoUrl: string;
    thumbnail: string;
    jobId: string;
    clientJobId: string;
    databaseJobId: string;
    providerJobId: string;
    statusJobId: string;
    mock: boolean;
  } | null;
  timelineBound: boolean;
  timelineBindError: string;
  errorCode: string;
  errorMessage: string;
};

export type MotionControlMode =
  | "character_motion"
  | "camera_motion"
  | "motion_transfer";

export type MotionControlAssetRef = {
  assetId: string;
  sourceNodeId: string;
  url: string;
  thumbnail: string;
};

export type MotionControlNodeData = StudioNodeBase & {
  kind: "motionControl";
  sourceImage: MotionControlAssetRef | null;
  motionReferenceVideo: MotionControlAssetRef | null;
  mode: MotionControlMode;
  prompt: string;
  status: GenerationNodeStatus;
  generationPlanId: string;
  queueStatus: StudioGenerationQueueItemStatus | null;
  jobIdentity: (VideoJobIdentity & { clientJobId: string }) | null;
  result: {
    videoUrl: string;
    thumbnail: string;
    jobId: string;
    clientJobId: string;
    databaseJobId: string;
    providerJobId: string;
    statusJobId: string;
    mock: boolean;
  } | null;
  timelineBound: boolean;
  timelineBindError: string;
  errorCode: string;
  errorMessage: string;
};

export type OutputNodeData = StudioNodeBase & {
  kind: "output";
  resultPreview: string;
  outputType: OutputType;
  createdAt: string;
  status: GenerationNodeStatus;
  jobId: string;
  thumbnail: string;
  errorMessage: string;
};

export type StudioNodeData = (
  | AssetNodeData
  | PromptNodeData
  | RemakeAnalysisNodeData
  | RemakePipelineNodeData
  | RemakeShotNodeData
  | ImageGenerateNodeData
  | VideoGenerateNodeData
  | VideoEditNodeData
  | MotionControlNodeData
  | OutputNodeData
) &
  Record<string, unknown>;

export type StudioNode = Node<StudioNodeData, StudioNodeType>;
export type StudioEdge = Edge;

export type StudioTimelineClipSource = "video_node" | "shot_node" | "asset";

export type StudioTimelineClipMetadata = {
  title?: string;
  model?: string;
  status?: string;
};

export type StudioVideoTimelineClip = {
  id: string;
  sourceNodeId: string;
  sourceType: StudioTimelineClipSource;
  thumbnail: string;
  url: string;
  start: number;
  duration: number;
  createdAt: string;
  /** Optional on read so clips created by Timeline schema v2 P1-A1 remain loadable. */
  metadata?: StudioTimelineClipMetadata;
};

export type StudioAudioTimelineClip = {
  id: string;
  sourceNodeId: string;
  sourceType: "asset" | "generated";
  url: string;
  thumbnail?: string;
  start: number;
  duration: number;
  createdAt: string;
  metadata: {
    title?: string;
    volume?: number;
  };
};

export type StudioSubtitlePosition = "top" | "center" | "bottom";

export type StudioSubtitleTimelineClip = {
  id: string;
  text: string;
  start: number;
  duration: number;
  createdAt: string;
  style?: {
    fontSize?: number;
    position?: StudioSubtitlePosition;
  };
};

export type StudioTimelineClip =
  | StudioVideoTimelineClip
  | StudioAudioTimelineClip
  | StudioSubtitleTimelineClip;

export type StudioVideoTimelineTrack = {
  id: string;
  type: "video";
  clips: StudioVideoTimelineClip[];
};

export type StudioAudioTimelineTrack = {
  id: string;
  type: "audio";
  clips: StudioAudioTimelineClip[];
};

export type StudioSubtitleTimelineTrack = {
  id: string;
  type: "subtitle";
  clips: StudioSubtitleTimelineClip[];
};

export type StudioTimelineTrack =
  | StudioVideoTimelineTrack
  | StudioAudioTimelineTrack
  | StudioSubtitleTimelineTrack;

export type StudioTimeline = {
  tracks: StudioTimelineTrack[];
};

export type StudioCanvasSnapshot = {
  nodes: StudioNode[];
  edges: StudioEdge[];
  viewport: Viewport;
  timeline: StudioTimeline;
  updatedAt: string;
};

export type StudioCanvasJson = {
  version: number | string;
  nodes: StudioNode[];
  edges: StudioEdge[];
  viewport: Viewport;
  /** Optional on read so Canvas v1 projects and templates remain loadable. */
  timeline?: StudioTimeline;
};

export type StudioProjectSummary = {
  id: string;
  name: string;
  thumbnail: string | null;
  updatedAt: string;
};

export type StudioProject = StudioProjectSummary & {
  canvasJson: StudioCanvasJson;
  createdAt: string;
};

export type StudioWorkflowTemplate = {
  id: string;
  name: string;
  canvas: StudioCanvasJson;
  createdAt: string;
};

export const STUDIO_NODE_DEFINITIONS: Array<{
  type: StudioNodeType;
  label: string;
  description: string;
}> = [
  {
    type: "asset",
    label: "Asset",
    description: "Image, video, or audio input",
  },
  {
    type: "prompt",
    label: "Prompt",
    description: "Creative direction and shot settings",
  },
  {
    type: "remakeAnalysis",
    label: "Remake Analysis",
    description: "Analyze one video into editable shot nodes",
  },
  {
    type: "remake_pipeline",
    label: "Remake Pipeline",
    description: "Build a local shot, video node, and timeline production plan",
  },
  {
    type: "remakeShot",
    label: "Remake Shot",
    description: "Storyboard shot prompt and reference frames",
  },
  {
    type: "imageGenerate",
    label: "Image Generate",
    description: "Image generation through the existing API",
  },
  {
    type: "videoGenerate",
    label: "Video Generate",
    description: "Video generation through the existing API",
  },
  {
    type: "video_edit",
    label: "Video Edit",
    description: "Mock video-to-video editing workflow",
  },
  {
    type: "motion_control",
    label: "Motion Control",
    description: "Character image and motion-reference workflow",
  },
  {
    type: "output",
    label: "Output",
    description: "Final result placeholder",
  },
];

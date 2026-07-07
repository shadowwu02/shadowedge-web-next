export type RemakeMode = "single_clip" | "full_film" | "long_video";
export type RemakeAnalysisSource = "fallback" | "vlm" | "sandbox_vlm" | "real_vlm";
export type VideoAnalysisBadge =
  | "fallback_storyboard"
  | "not_real_visual_reverse"
  | "no_vision_model"
  | "sandbox_vlm"
  | "partial_result";

export type RemakeTargetRegion = "US" | "Middle East" | "Japan" | "Southeast Asia";

export type RemakeSourceVideo = {
  assetId?: string;
  duration?: number;
  file?: File;
  lastModified: number;
  name: string;
  size: number;
  type: string;
  url?: string;
};

export type RemakeSourceVideoMetadata = {
  codec?: string;
  duration: number;
  fps?: number;
  height?: number;
  width?: number;
};

export type RemakeKeyframe = {
  height?: number;
  time: number;
  url: string;
  width?: number;
};

export type RemakeSegment = {
  duration: number;
  end: number;
  id: string;
  keyframes?: RemakeKeyframe[];
  start: number;
};

export type RemakeEpisodeCoverage = {
  actualShotCount: number;
  coverageRatio: number;
  durationSeconds?: number;
  endsAtDuration?: boolean;
  firstTimestamp?: number | null;
  gapCount?: number;
  lastTimestamp?: number | null;
  ok: boolean;
  reason?: string | null;
  recommendedMinShotCount: number;
  recommendedShotCount?: number;
  startsAtZero?: boolean;
};

export type RemakeEpisodeChunk = {
  chunkIndex: number;
  coverage?: RemakeEpisodeCoverage;
  duration: number;
  end: number;
  id: string;
  shotBeatCount: number;
  start: number;
  status?: string;
};

export type RemakeEpisodeResult = {
  analysisSource?: RemakeAnalysisSource;
  coverage?: RemakeEpisodeCoverage;
  chunks?: RemakeEpisodeChunk[];
  episode?: boolean;
  episodeStage?: string;
  metadata?: Record<string, unknown>;
  mode?: "full_episode";
  mock?: boolean;
  note?: string;
  providerCallMade?: boolean;
  realVisualUnderstanding?: boolean;
  remakePlan?: string[];
  shotList?: unknown[];
  storyboard?: RemakeStoryboard;
  summary?: string;
  timeline?: unknown[];
  vlmCalled?: boolean;
};

export type VideoAnalysisVisualUnderstanding = {
  mock: boolean;
  provider: string;
  providerCallMade: boolean;
  realVisualUnderstanding: boolean;
  sandbox: boolean;
  vlmCalled: boolean;
};

export type VideoAnalysisCoverage = {
  actualShotCount: number;
  coverageRatio: number;
  durationSeconds?: number;
  endsAtDuration: boolean;
  firstTimestamp: number | null;
  gapCount: number;
  lastTimestamp: number | null;
  ok: boolean;
  reason?: string | null;
  recommendedShotCount: number;
  startsAtZero: boolean;
};

export type VideoAnalysisChunk = {
  chunkIndex: number;
  coverage?: VideoAnalysisCoverage;
  duration: number;
  end: number;
  id?: string;
  shotCount: number;
  start: number;
  status?: string;
};

export type VideoAnalysisShot = {
  action?: string;
  cameraMotion?: string;
  composition?: string;
  end: number;
  prompt?: string;
  shotIndex: number;
  start: number;
  timestamp?: string;
};

export type VideoAnalysisTimelineItem = {
  end: number;
  index: number;
  label?: string;
  start: number;
  summary?: string;
};

export type VideoAnalysisRemakePlanItem = {
  index: number;
  prompt: string;
  title: string;
};

export type VideoAnalysisCanonicalResult = {
  analysisEngine: "mock_only" | "mock_episode_beta" | "sandbox_vlm" | "real_vlm";
  analysisSource: "mock" | "fallback" | "sandbox" | "mock_episode_beta" | "vlm";
  badges: VideoAnalysisBadge[];
  chunks: VideoAnalysisChunk[];
  coverage: VideoAnalysisCoverage;
  durationSeconds: number;
  mode: "long_video" | "full_episode" | "clip_reverse";
  remakePlan: VideoAnalysisRemakePlanItem[];
  shots: VideoAnalysisShot[];
  status: string;
  storyboard: {
    mock: boolean;
    sandbox: boolean;
    shots: VideoAnalysisShot[];
    summary?: string;
  };
  timeline: VideoAnalysisTimelineItem[];
  version: "video-analysis-result-v1" | string;
  visualUnderstanding: VideoAnalysisVisualUnderstanding;
  warnings: string[];
};

export type RemakeShot = {
  shotGroupId: string;
  shot: number;
  sourceTimeRange: {
    start: number;
    end: number;
  };
  duration: number;
  keyframes?: RemakeKeyframe[];
  camera: string;
  motion: string;
  position: string;
  action: string;
  emotion: string;
  dialogue: string;
  audio: string;
  prompt: string;
  referenceHints: {
    images: string[];
    videos: string[];
    audios: string[];
    characters: string[];
  };
  generationParams: {
    modelId: string;
    ratio: string;
    duration: number;
    quality: string;
  };
};

export type RemakeShotQueueStatus = "idle" | "running" | "paused" | "completed" | "failed" | "cancelled";
export type RemakeShotQueueIntent = "generate_all" | "retry_failed" | "retry_single";
export type RemakeShotQueueMode = "serial" | "retry_serial";

export type RemakeShotGenerationStatus = "idle" | "queued" | "generating" | "success" | "failed" | "skipped";

export type RemakeShotGenerationState = {
  error?: string;
  outputUrl?: string;
  queueIndex?: number;
  queueRunId?: string;
  queueTotal?: number;
  queueMode?: RemakeShotQueueMode;
  retryAttempt?: number;
  retryOfShotKey?: string;
  retryOfTaskId?: string;
  retryQueueRunId?: string;
  startedAt?: number;
  status: RemakeShotGenerationStatus;
  taskId?: string;
  updatedAt?: number;
};

export type RemakeStoryboard = {
  id: string;
  mode: RemakeMode;
  analysisSource?: RemakeAnalysisSource;
  aspectRatio?: string;
  fallbackReason?: string;
  mock?: boolean;
  providerCallMade?: boolean;
  sandboxVlm?: boolean;
  sourceTitle?: string;
  targetRatio?: string;
  targetRegion: RemakeTargetRegion;
  characterRules: string;
  sceneStyle: string;
  translateDialogue: boolean;
  vlmCalled?: boolean;
  vlmProvider?: string;
  shots: RemakeShot[];
};

export type RemakeSettings = {
  aspectRatio?: string;
  characterRules: string;
  mode: RemakeMode;
  sceneStyle: string;
  targetRatio?: string;
  targetRegion: RemakeTargetRegion;
  translateDialogue: boolean;
};

export function getRemakeShotGenerationKey(
  storyboardId: string | undefined,
  shot: Pick<RemakeShot, "shot" | "shotGroupId">,
) {
  return `${storyboardId || "remake"}:${shot.shotGroupId}:${shot.shot}`;
}

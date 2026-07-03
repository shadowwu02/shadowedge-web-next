export type RemakeMode = "single_clip" | "full_film" | "long_video";
export type RemakeAnalysisSource = "fallback" | "vlm" | "sandbox_vlm" | "real_vlm";

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
  firstTimestamp?: number | null;
  gapCount?: number;
  lastTimestamp?: number | null;
  ok: boolean;
  reason?: string | null;
  recommendedMinShotCount: number;
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
  coverage?: RemakeEpisodeCoverage;
  chunks?: RemakeEpisodeChunk[];
  episode?: boolean;
  episodeStage?: string;
  mode?: "full_episode";
  mock?: boolean;
  note?: string;
  providerCallMade?: boolean;
  remakePlan?: string[];
  shotList?: unknown[];
  summary?: string;
  vlmCalled?: boolean;
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
  fallbackReason?: string;
  mock?: boolean;
  providerCallMade?: boolean;
  sandboxVlm?: boolean;
  sourceTitle?: string;
  targetRegion: RemakeTargetRegion;
  characterRules: string;
  sceneStyle: string;
  translateDialogue: boolean;
  vlmCalled?: boolean;
  vlmProvider?: string;
  shots: RemakeShot[];
};

export type RemakeSettings = {
  characterRules: string;
  mode: RemakeMode;
  sceneStyle: string;
  targetRegion: RemakeTargetRegion;
  translateDialogue: boolean;
};

export function getRemakeShotGenerationKey(
  storyboardId: string | undefined,
  shot: Pick<RemakeShot, "shot" | "shotGroupId">,
) {
  return `${storyboardId || "remake"}:${shot.shotGroupId}:${shot.shot}`;
}

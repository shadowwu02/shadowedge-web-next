import { apiRequest } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";
import { normalizeMediaAssetUrl } from "@/lib/media-assets";
import { ApiError } from "@/types/api";
import type {
  RemakeAnalysisSource,
  RemakeEpisodeChunk,
  RemakeEpisodeCoverage,
  RemakeEpisodeResult,
  RemakeMode,
  RemakeSegment,
  RemakeSourceVideoMetadata,
  RemakeStoryboard,
  RemakeTargetRegion,
  VideoAnalysisCanonicalResult,
} from "@/components/video/remake/remakeTypes";
import { getSafeHistoryOutputUrl, getSafeHistoryThumbnailUrl } from "@/lib/video/historyUtils";
import type {
  UploadedMediaResponse,
  UploadMediaType,
  VideoGenerationRequest,
  VideoHistoryItem,
  VideoModel,
  VideoStatusResponse,
} from "@/types/video";

type RawModel = Record<string, unknown>;
type RawRecord = Record<string, unknown>;

export type VideoRemakeReverseAnalyzeInput = {
  aspectRatio?: string;
  characterRules: string;
  mode: RemakeMode;
  sceneStyle: string;
  sourceFileName?: string;
  sourceLanguage?: string;
  sourceVideoUrl?: string;
  targetLanguage?: string;
  targetRatio?: string;
  targetRegion: RemakeTargetRegion;
  translateDialogue: boolean;
};

export type VideoRemakeReverseAnalyzeResponse = {
  meta?: {
    analysisId?: string;
    analysisSource?: RemakeAnalysisSource;
    aspectRatio?: string;
    estimatedCredits?: number;
    metadataOnly?: boolean;
    mock?: boolean;
    nextStep?: string;
    segments?: RemakeSegment[];
    sourceVideo?: RemakeSourceVideoMetadata;
    fallbackReason?: string;
    providerCallMade?: boolean;
    sandboxVlm?: boolean;
    targetRatio?: string;
    vlmCalled?: boolean;
    vlmFailed?: boolean;
    vlmModel?: string;
    vlmProvider?: string;
    vlmUnavailable?: boolean;
  };
  storyboard: RemakeStoryboard;
};

export type VideoRemakeLongAnalysisStage =
  | "queued"
  | "reading_metadata"
  | "preparing"
  | "extracting_keyframes"
  | "extracting_frames"
  | "analyzing_segments"
  | "analyzing"
  | "building_storyboard"
  | "merging_storyboard"
  | "completed"
  | "failed";

export type VideoRemakeLongAnalysisStatus = "queued" | "processing" | "completed" | "failed";

export type VideoRemakeLongAnalysisJob = {
  analysisJobId: string;
  canonicalResult?: VideoAnalysisCanonicalResult | null;
  status: VideoRemakeLongAnalysisStatus;
  progress: number | null;
  stage: VideoRemakeLongAnalysisStage;
  result?: {
    metadata?: Record<string, unknown>;
    note?: string;
    remakePrompt?: string;
    scenes?: unknown[];
    segments?: RemakeSegment[];
    shotList?: unknown[];
    sourceVideo?: RemakeSourceVideoMetadata;
    storyboard?: RemakeStoryboard;
    summary?: string;
  } | null;
  sourceVideo?: RemakeSourceVideoMetadata;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

export type VideoRemakeFullEpisodeAnalysisJob = Omit<VideoRemakeLongAnalysisJob, "result"> & {
  chunks?: RemakeEpisodeChunk[];
  coverage?: RemakeEpisodeCoverage | null;
  episodeStage?: string;
  result?: (VideoRemakeLongAnalysisJob["result"] & RemakeEpisodeResult) | null;
};

export type VideoRemakeFullEpisodeAnalysisCreateInput = {
  aspectRatio?: string;
  clientRequestId?: string;
  sourceAssetId?: string;
  sourceVideoUrl: string;
  targetRatio?: string;
};

export type VideoRemakeLongAnalysisCreateInput = {
  analysisEngine?: "mock" | "real_vlm";
  aspectRatio?: string;
  clientRequestId?: string;
  confirmCost?: boolean;
  estimateId?: string;
  sourceAssetId?: string;
  sourceVideoUrl: string;
  targetRatio?: string;
};

export type VideoRemakeLongAnalysisCostEstimateInput = {
  analysisEngine?: "mock" | "real_vlm" | "sandbox_vlm";
  aspectRatio?: string;
  provider?: string;
  sourceAssetId?: string;
  sourceVideoUrl: string;
  targetRatio?: string;
};

export type VideoRemakeLongAnalysisAdapterStatus = {
  connected: boolean;
  dryRunOnly: boolean;
  maxDurationSeconds?: number;
  maxFrames?: number;
  maxSegments?: number;
  provider: string;
  providerCallMade?: boolean;
  requestBuilderReady?: boolean;
  supportsRealCalls: boolean;
};

export type VideoRemakeLongAnalysisCostEstimate = {
  analysisMode: "mock_only" | "real_vlm" | "sandbox_vlm";
  adapterStatus?: VideoRemakeLongAnalysisAdapterStatus;
  balance: number | null;
  billableNow: boolean;
  chargeCreditsNow: number;
  estimateId: string | null;
  estimatedCredits: number;
  estimatedCreditsIfRealVlm: number;
  estimatedCostUnits: number | null;
  estimatedKeyframeCount: number | null;
  estimatedSegmentCount: number | null;
  hasEnoughCredits: boolean;
  message: string;
  mode: "long_video";
  requiresConfirmation: boolean;
  requiresMetadataProbe: boolean;
  requiresRealVlmEnabled: boolean;
  sandboxAllowed?: boolean;
  safety: {
    adapterDryRunOnly?: boolean;
    mockOnly: boolean;
    supportsRealCalls?: boolean;
    vlmEnabled: boolean;
    willCallProvider: boolean;
    willChargeCredits: boolean;
  };
};

function buildDurationArray(config: unknown) {
  const item = (config || {}) as { values?: unknown[]; min?: number; max?: number };
  if (Array.isArray(item.values)) return item.values.map(Number).filter(Number.isFinite);
  const min = Number(item.min || 1);
  const max = Number(item.max || 15);
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => min + index);
}

export function normalizeVideoModel(model: RawModel): VideoModel {
  const durations = Array.isArray(model.durations)
    ? model.durations.map(Number).filter(Number.isFinite)
    : buildDurationArray(model.duration);
  const label = String(model.name || model.label || model.id || "Video Model")
    .replace(/\s*HF\s*$/i, "")
    .trim();

  return {
    id: String(model.id || label),
    label,
    provider: String(model.provider || "auto"),
    providerModel: String(model.providerModel || ""),
    desc: String(model.desc || model.type || model.mode || "Video generation"),
    credits: Number(model.credits || 0),
    creditBase: Number(model.creditBase || model.credits || 0),
    durations: durations.length ? durations : [5],
    durationDefault: Number((model.duration as { default?: number } | undefined)?.default || durations[0] || 5),
    ratios: Array.isArray(model.ratios) && model.ratios.length ? model.ratios.map(String) : ["16:9"],
    qualities: Array.isArray(model.resolutions)
      ? model.resolutions.map(String)
      : Array.isArray(model.qualities)
        ? model.qualities.map(String)
        : ["720p"],
    supportsAudio: Boolean(model.supportsAudio),
    uploadSlots: Array.isArray(model.uploadSlots) ? model.uploadSlots.map(String) : ["media"],
    raw: model,
  };
}

function getReverseAnalyzeErrorMessage(payload: unknown) {
  const record = asRecord(payload);
  return pickString(record.message, record.error, record.code) || "Reverse analyze API request failed.";
}

export async function reverseAnalyzeVideoRemake(input: VideoRemakeReverseAnalyzeInput): Promise<VideoRemakeReverseAnalyzeResponse> {
  let response: Response;
  const token = getStoredAuthToken();

  try {
    response = await fetch("/api/internal/video/reverse-analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Reverse analyze API is unavailable.");
  }

  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = {
      ok: false,
      error: text,
    };
  }

  const record = asRecord(payload);
  if (!response.ok || record.ok === false) {
    throw new ApiError(getReverseAnalyzeErrorMessage(record), {
      code: pickString(record.code, record.error_code, record.errorCode),
      kind: response.status === 401 ? "auth" : response.status >= 500 ? "server" : "unknown",
      payload: record,
      status: response.status,
    });
  }

  const data = asRecord(record.data);
  const storyboard = (record.storyboard || data.storyboard) as RemakeStoryboard | undefined;

  if (!storyboard?.shots?.length) {
    throw new Error("Reverse analyze API returned no storyboard.");
  }

  return {
    meta: asRecord(record.meta || data.meta) as VideoRemakeReverseAnalyzeResponse["meta"],
    storyboard,
  };
}

function hasRecordKeys(record: RawRecord) {
  return Object.keys(record).length > 0;
}

function unwrapRemakeAnalysisPayload(payload: unknown) {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const rootJob = asRecord(root.job);
  const dataJob = asRecord(data.job);
  const job = hasRecordKeys(dataJob) ? dataJob : hasRecordKeys(rootJob) ? rootJob : hasRecordKeys(data) ? data : root;
  const result = asRecord(job.result || data.result || root.result);
  const metadata = asRecord(job.metadata || data.metadata || root.metadata || result.metadata);
  const sourceVideo = asRecord(job.sourceVideo || data.sourceVideo || root.sourceVideo || result.sourceVideo);
  const canonicalResult =
    root.canonicalResult ||
    data.canonicalResult ||
    rootJob.canonicalResult ||
    dataJob.canonicalResult ||
    job.canonicalResult;

  return {
    canonicalResult,
    data,
    job,
    metadata,
    result,
    root,
    sourceVideo,
  };
}

function normalizeLongAnalysisJob(payload: unknown): VideoRemakeLongAnalysisJob {
  const { canonicalResult: rawCanonicalResult, data, job, metadata, result, root, sourceVideo } = unwrapRemakeAnalysisPayload(payload);
  const analysisJobId = pickString(job.analysisJobId, job.id, data.analysisJobId, data.id, root.analysisJobId, root.id) || "";
  const status = pickString(job.status, data.status, root.status) || "queued";
  const canonicalResult = normalizeVideoAnalysisResult(rawCanonicalResult, {
    job,
    metadata,
    mode: pickString(result.mode, job.mode, data.mode, root.mode) === "full_episode" ? "full_episode" : "long_video",
    result,
    status,
  });
  const sourceDuration = Number(sourceVideo.duration ?? sourceVideo.durationSeconds);
  const rawProgress = job.progress ?? data.progress ?? root.progress;
  const normalizedProgress =
    rawProgress === undefined || rawProgress === null || rawProgress === ""
      ? null
      : Number.isFinite(Number(rawProgress))
        ? Math.min(1, Math.max(0, Number(rawProgress)))
        : null;

  return {
    analysisJobId,
    canonicalResult,
    errorCode: pickString(job.errorCode, job.error_code, data.errorCode, data.error_code, root.errorCode, root.error_code, root.error),
    errorMessage: pickString(job.errorMessage, job.error_message, data.errorMessage, data.error_message, root.errorMessage, root.message),
    metadata,
    progress: normalizedProgress,
    result: Object.keys(result).length ? (result as VideoRemakeLongAnalysisJob["result"]) : null,
    sourceVideo: Number(sourceDuration)
      ? {
          codec: pickString(sourceVideo.codec),
          duration: sourceDuration,
          fps: Number(sourceVideo.fps) || undefined,
          height: Number(sourceVideo.height) || undefined,
          width: Number(sourceVideo.width) || undefined,
        }
      : undefined,
    stage: (pickString(job.stage, data.stage, root.stage) || "queued") as VideoRemakeLongAnalysisStage,
    status: status as VideoRemakeLongAnalysisStatus,
  };
}

function normalizeEpisodeCoverage(value: unknown): RemakeEpisodeCoverage | null {
  const record = asRecord(value);
  if (!Object.keys(record).length) return null;

  return {
    actualShotCount: Number(record.actualShotCount || 0),
    coverageRatio: Number(record.coverageRatio || 0),
    durationSeconds: Number.isFinite(Number(record.durationSeconds)) ? Number(record.durationSeconds) : undefined,
    firstTimestamp: Number.isFinite(Number(record.firstTimestamp)) ? Number(record.firstTimestamp) : null,
    gapCount: Number.isFinite(Number(record.gapCount)) ? Number(record.gapCount) : undefined,
    lastTimestamp: Number.isFinite(Number(record.lastTimestamp)) ? Number(record.lastTimestamp) : null,
    ok: record.ok === true,
    reason: pickString(record.reason) || null,
    recommendedMinShotCount: Number(record.recommendedMinShotCount ?? record.recommendedShotCount ?? 0),
  };
}

function normalizeEpisodeChunk(value: unknown): RemakeEpisodeChunk {
  const record = asRecord(value);
  return {
    chunkIndex: Number(record.chunkIndex || 0),
    coverage: normalizeEpisodeCoverage(record.coverage) || undefined,
    duration: Number(record.duration || 0),
    end: Number(record.end || 0),
    id: pickString(record.id) || "",
    shotBeatCount: Number(record.shotBeatCount ?? record.shotCount ?? 0),
    start: Number(record.start || 0),
    status: pickString(record.status) || undefined,
  };
}

function normalizeCanonicalCoverage(value: unknown, fallback?: Partial<VideoAnalysisCanonicalResult["coverage"]>) {
  const record = asRecord(value);
  const coverageRatio = Number(record.coverageRatio ?? fallback?.coverageRatio ?? (record.ok === true ? 1 : 0)) || 0;
  const firstTimestamp = Number.isFinite(Number(record.firstTimestamp)) ? Number(record.firstTimestamp) : (fallback?.firstTimestamp ?? null);
  const lastTimestamp = Number.isFinite(Number(record.lastTimestamp)) ? Number(record.lastTimestamp) : (fallback?.lastTimestamp ?? null);
  const durationSeconds = Number.isFinite(Number(record.durationSeconds)) ? Number(record.durationSeconds) : fallback?.durationSeconds;
  return {
    actualShotCount: Number(record.actualShotCount ?? record.shotCount ?? fallback?.actualShotCount ?? 0) || 0,
    coverageRatio,
    durationSeconds,
    endsAtDuration: record.endsAtDuration === true || fallback?.endsAtDuration === true,
    firstTimestamp,
    gapCount: Number(record.gapCount ?? fallback?.gapCount ?? 0) || 0,
    lastTimestamp,
    ok: record.ok === true || fallback?.ok === true,
    reason: pickString(record.reason, fallback?.reason) || null,
    recommendedShotCount: Number(record.recommendedShotCount ?? record.recommendedMinShotCount ?? fallback?.recommendedShotCount ?? 0) || 0,
    startsAtZero: record.startsAtZero === true || fallback?.startsAtZero === true,
  };
}

function normalizeCanonicalShot(value: unknown, index: number): VideoAnalysisCanonicalResult["shots"][number] {
  const record = asRecord(value);
  const range = asRecord(record.sourceTimeRange || record.timeRange);
  const start = Number(range.start ?? record.start ?? index * 5) || 0;
  const end = Number(range.end ?? record.end ?? start + 5) || start;
  const shotIndex = Number(record.shotIndex ?? record.globalShotIndex ?? record.shot ?? index + 1) || index + 1;
  return {
    action: pickString(record.action, record.summary),
    cameraMotion: pickString(record.cameraMotion, record.camera, record.motion),
    composition: pickString(record.composition, record.position),
    end,
    prompt: pickString(record.prompt, record.summary),
    shotIndex,
    start,
    timestamp: pickString(record.timestamp) || `${start}-${end}s`,
  };
}

function normalizeCanonicalChunk(value: unknown): VideoAnalysisCanonicalResult["chunks"][number] {
  const record = asRecord(value);
  const start = Number(record.start) || 0;
  const end = Number(record.end) || start;
  const chunkIndex = Number(record.chunkIndex ?? record.index ?? 1) || 1;
  return {
    chunkIndex,
    coverage: Object.keys(asRecord(record.coverage)).length ? normalizeCanonicalCoverage(record.coverage) : undefined,
    duration: Number(record.duration ?? Math.max(0, end - start)) || 0,
    end,
    id: pickString(record.id) || `chunk_${chunkIndex}`,
    shotCount: Number(record.shotCount ?? record.shotBeatCount ?? 0) || 0,
    start,
    status: pickString(record.status) || undefined,
  };
}

function normalizeCanonicalRemakePlan(value: unknown): VideoAnalysisCanonicalResult["remakePlan"] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    if (typeof item === "string") {
      return {
        index: index + 1,
        prompt: item,
        title: `Step ${index + 1}`,
      };
    }
    const record = asRecord(item);
    return {
      index: Number(record.index ?? index + 1) || index + 1,
      prompt: pickString(record.prompt, record.description, record.summary) || "",
      title: pickString(record.title, record.label) || `Step ${index + 1}`,
    };
  });
}

export function normalizeVideoAnalysisResult(
  value: unknown,
  fallback?: {
    job?: RawRecord;
    metadata?: RawRecord;
    mode?: "long_video" | "full_episode" | "clip_reverse";
    result?: RawRecord;
    status?: string;
  },
): VideoAnalysisCanonicalResult | null {
  const canonical = asRecord(value);
  const fallbackResult = asRecord(fallback?.result);
  const fallbackMetadata = asRecord(fallback?.metadata || fallbackResult.metadata);
  const storyboard = asRecord(canonical.storyboard || fallbackResult.storyboard);
  const rawShots = Array.isArray(canonical.shots)
    ? canonical.shots
    : Array.isArray(fallbackResult.shotList)
      ? fallbackResult.shotList
      : Array.isArray(storyboard.shots)
        ? storyboard.shots
        : [];
  const rawChunks = Array.isArray(canonical.chunks)
    ? canonical.chunks
    : Array.isArray(fallbackResult.chunks)
      ? fallbackResult.chunks
      : [];
  const mode =
    pickString(canonical.mode, fallbackResult.mode, fallback?.mode) === "full_episode"
      ? "full_episode"
      : pickString(canonical.mode, fallback?.mode) === "clip_reverse"
        ? "clip_reverse"
        : "long_video";
  const analysisEngine =
    pickString(canonical.analysisEngine, fallbackMetadata.analysisEngine) === "real_vlm"
      ? "real_vlm"
      : pickString(canonical.analysisEngine, fallbackMetadata.analysisEngine) === "sandbox_vlm"
        ? "sandbox_vlm"
        : mode === "full_episode"
          ? "mock_episode_beta"
          : "mock_only";
  const analysisSource =
    pickString(canonical.analysisSource, fallbackResult.analysisSource, storyboard.analysisSource) === "vlm" ||
    pickString(canonical.analysisSource, fallbackResult.analysisSource, storyboard.analysisSource) === "real_vlm"
      ? "vlm"
      : analysisEngine === "sandbox_vlm" ||
          pickString(canonical.analysisSource, fallbackResult.analysisSource, storyboard.analysisSource) === "sandbox"
        ? "sandbox"
        : analysisEngine === "mock_episode_beta"
          ? "mock_episode_beta"
          : "fallback";
  const shots = rawShots.map(normalizeCanonicalShot);
  const coverage = normalizeCanonicalCoverage(canonical.coverage || fallbackResult.coverage, {
    actualShotCount: shots.length,
    ok: false,
    reason: "COVERAGE_UNKNOWN",
  });
  const visualRecord = asRecord(canonical.visualUnderstanding);
  const vlmCalled = visualRecord.vlmCalled === true || fallbackMetadata.vlmCalled === true || fallbackResult.vlmCalled === true || storyboard.vlmCalled === true;
  const providerCallMade =
    visualRecord.providerCallMade === true ||
    fallbackMetadata.providerCallMade === true ||
    fallbackResult.providerCallMade === true ||
    storyboard.providerCallMade === true;
  const sandbox =
    visualRecord.sandbox === true ||
    fallbackMetadata.sandboxVlm === true ||
    fallbackResult.sandboxVlm === true ||
    storyboard.sandbox === true ||
    storyboard.sandboxVlm === true ||
    analysisEngine === "sandbox_vlm";
  const realVisualUnderstanding =
    visualRecord.realVisualUnderstanding === true || fallbackMetadata.realVisualUnderstanding === true || fallbackResult.realVisualUnderstanding === true;
  const mock =
    visualRecord.mock === true ||
    fallbackMetadata.mock === true ||
    fallbackResult.mock === true ||
    storyboard.mock === true ||
    (!vlmCalled && !providerCallMade && !realVisualUnderstanding);
  const badges = Array.isArray(canonical.badges)
    ? canonical.badges.map(String)
    : [
        ...(!realVisualUnderstanding ? ["fallback_storyboard", "not_real_visual_reverse", "no_vision_model"] : []),
        ...(sandbox ? ["sandbox_vlm"] : []),
        ...(!coverage.ok ? ["partial_result"] : []),
      ];
  const warnings = Array.isArray(canonical.warnings)
    ? canonical.warnings.map(String)
    : [coverage.reason || "", !shots.length ? "SHOTS_UNKNOWN" : ""].filter(Boolean);

  if (!Object.keys(canonical).length && !Object.keys(fallbackResult).length && !shots.length) return null;

  return {
    analysisEngine,
    analysisSource,
    badges: Array.from(new Set(badges)) as VideoAnalysisCanonicalResult["badges"],
    chunks: rawChunks.map(normalizeCanonicalChunk),
    coverage,
    durationSeconds: Number(canonical.durationSeconds ?? asRecord(fallbackResult.sourceVideo).duration ?? 0) || 0,
    mode,
    remakePlan: normalizeCanonicalRemakePlan(canonical.remakePlan || fallbackResult.remakePlan),
    shots,
    status: pickString(canonical.status, fallback?.status) || "completed",
    storyboard: {
      mock,
      sandbox,
      shots,
      summary: pickString(asRecord(canonical.storyboard).summary, fallbackResult.summary, fallbackResult.note),
    },
    timeline: Array.isArray(canonical.timeline)
      ? canonical.timeline.map((item, index) => {
          const record = asRecord(item);
          return {
            end: Number(record.end ?? index * 5 + 5) || 0,
            index: Number(record.index ?? record.shot ?? index + 1) || index + 1,
            label: pickString(record.label, record.title) || `Beat ${index + 1}`,
            start: Number(record.start ?? index * 5) || 0,
            summary: pickString(record.summary, record.action, record.prompt),
          };
        })
      : shots.map((shot) => ({
          end: shot.end,
          index: shot.shotIndex,
          label: `Beat ${shot.shotIndex}`,
          start: shot.start,
          summary: shot.action || shot.prompt,
        })),
    version: pickString(canonical.version) || "video-analysis-result-v1",
    visualUnderstanding: {
      mock,
      provider: pickString(visualRecord.provider, fallbackMetadata.provider, fallbackResult.provider) || (sandbox ? "sandbox" : "disabled"),
      providerCallMade,
      realVisualUnderstanding,
      sandbox,
      vlmCalled,
    },
    warnings,
  };
}

function normalizeFullEpisodeAnalysisJob(payload: unknown): VideoRemakeFullEpisodeAnalysisJob {
  const job = normalizeLongAnalysisJob(payload) as VideoRemakeFullEpisodeAnalysisJob;
  const { data, job: rawJob, result, root } = unwrapRemakeAnalysisPayload(payload);
  const baseResult = asRecord(job.result);
  const canonicalResult = job.canonicalResult;
  const chunks = Array.isArray(root.chunks)
    ? root.chunks
    : Array.isArray(data.chunks)
      ? data.chunks
      : Array.isArray(rawJob.chunks)
        ? rawJob.chunks
        : Array.isArray(result.chunks)
          ? result.chunks
          : Array.isArray(canonicalResult?.chunks)
            ? canonicalResult.chunks
            : [];
  const coverage = normalizeEpisodeCoverage(root.coverage || data.coverage || rawJob.coverage || result.coverage || canonicalResult?.coverage);
  const hasEpisodeResult =
    Object.keys(baseResult).length > 0 ||
    Object.keys(result).length > 0 ||
    chunks.length > 0 ||
    Boolean(coverage) ||
    Boolean(canonicalResult);
  const storyboard = asRecord(result.storyboard || baseResult.storyboard);
  const metadata = asRecord(result.metadata || baseResult.metadata || rawJob.metadata);

  return {
    ...job,
    chunks: chunks.map(normalizeEpisodeChunk),
    coverage,
    episodeStage: pickString(asRecord(rawJob.metadata).episodeStage, data.episodeStage, root.episodeStage, result.episodeStage, job.stage),
    result: hasEpisodeResult
      ? {
          ...baseResult,
          ...result,
          analysisSource: (pickString(result.analysisSource, baseResult.analysisSource) as RemakeAnalysisSource | undefined) || "fallback",
          chunks: chunks.map(normalizeEpisodeChunk),
          coverage: coverage || undefined,
          episode: result.episode === true || baseResult.episode === true,
          episodeStage: pickString(result.episodeStage, baseResult.episodeStage),
          metadata: Object.keys(metadata).length ? metadata : undefined,
          mode: result.mode === "full_episode" || baseResult.mode === "full_episode" ? "full_episode" : undefined,
          mock: result.mock === true || baseResult.mock === true,
          note: pickString(result.note, baseResult.note, canonicalResult?.storyboard.summary),
          providerCallMade: result.providerCallMade === true || baseResult.providerCallMade === true,
          remakePlan: Array.isArray(result.remakePlan)
            ? result.remakePlan.map(String)
            : Array.isArray(baseResult.remakePlan)
              ? baseResult.remakePlan.map(String)
              : Array.isArray(canonicalResult?.remakePlan)
                ? canonicalResult.remakePlan.map((item) => item.prompt || item.title)
                : undefined,
          shotList: Array.isArray(result.shotList)
            ? result.shotList
            : Array.isArray(baseResult.shotList)
              ? baseResult.shotList
              : Array.isArray(canonicalResult?.shots)
                ? canonicalResult.shots
                : undefined,
          storyboard: Object.keys(storyboard).length ? (storyboard as RemakeStoryboard) : undefined,
          summary: pickString(result.summary, baseResult.summary, canonicalResult?.storyboard.summary),
          timeline: Array.isArray(result.timeline)
            ? result.timeline
            : Array.isArray(baseResult.timeline)
              ? baseResult.timeline
              : Array.isArray(canonicalResult?.timeline)
                ? canonicalResult.timeline
                : undefined,
          vlmCalled: result.vlmCalled === true || baseResult.vlmCalled === true,
        }
      : null,
  };
}

export function normalizeFullEpisodeStatusResponse(raw: unknown) {
  return normalizeFullEpisodeAnalysisJob(raw);
}

function normalizeLongAnalysisCostEstimate(payload: unknown): VideoRemakeLongAnalysisCostEstimate {
  const record = asRecord(payload);
  const data = asRecord(record.data);
  const estimate = asRecord(record.estimate || data.estimate || record);
  const adapter = asRecord(estimate.adapterStatus || record.adapterStatus || asRecord(record.data).adapterStatus);
  const safety = asRecord(estimate.safety);
  const rawAnalysisMode = pickString(estimate.analysisMode);
  const analysisMode = rawAnalysisMode === "real_vlm" || rawAnalysisMode === "sandbox_vlm" ? rawAnalysisMode : "mock_only";

  return {
    analysisMode,
    adapterStatus: Object.keys(adapter).length
      ? {
          connected: adapter.connected === true,
          dryRunOnly: adapter.dryRunOnly === true,
          maxDurationSeconds: Number.isFinite(Number(adapter.maxDurationSeconds)) ? Number(adapter.maxDurationSeconds) : undefined,
          maxFrames: Number.isFinite(Number(adapter.maxFrames)) ? Number(adapter.maxFrames) : undefined,
          maxSegments: Number.isFinite(Number(adapter.maxSegments)) ? Number(adapter.maxSegments) : undefined,
          provider: pickString(adapter.provider) || "disabled",
          providerCallMade: adapter.providerCallMade === true,
          requestBuilderReady: adapter.requestBuilderReady === true,
          supportsRealCalls: adapter.supportsRealCalls === true,
        }
      : undefined,
    balance: Number.isFinite(Number(estimate.balance)) ? Number(estimate.balance) : null,
    billableNow: estimate.billableNow === true,
    chargeCreditsNow: Number(estimate.chargeCreditsNow || 0),
    estimateId: pickString(estimate.estimateId, estimate.estimate_id, record.estimateId, record.estimate_id, data.estimateId, data.estimate_id) || null,
    estimatedCredits: Number(estimate.estimatedCredits || 0),
    estimatedCreditsIfRealVlm: Number(estimate.estimatedCreditsIfRealVlm || 0),
    estimatedCostUnits: Number.isFinite(Number(estimate.estimatedCostUnits)) ? Number(estimate.estimatedCostUnits) : null,
    estimatedKeyframeCount: Number.isFinite(Number(estimate.estimatedKeyframeCount)) ? Number(estimate.estimatedKeyframeCount) : null,
    estimatedSegmentCount: Number.isFinite(Number(estimate.estimatedSegmentCount)) ? Number(estimate.estimatedSegmentCount) : null,
    hasEnoughCredits: estimate.hasEnoughCredits !== false,
    message: pickString(estimate.message) || "",
    mode: "long_video",
    requiresConfirmation: estimate.requiresConfirmation === true,
    requiresMetadataProbe: estimate.requiresMetadataProbe === true,
    requiresRealVlmEnabled: estimate.requiresRealVlmEnabled === true,
    sandboxAllowed: typeof estimate.sandboxAllowed === "boolean" ? estimate.sandboxAllowed : undefined,
    safety: {
      adapterDryRunOnly: safety.adapterDryRunOnly === true,
      mockOnly: safety.mockOnly !== false,
      supportsRealCalls: safety.supportsRealCalls === true,
      vlmEnabled: safety.vlmEnabled === true,
      willCallProvider: safety.willCallProvider === true,
      willChargeCredits: safety.willChargeCredits === true,
    },
  };
}

export async function estimateLongVideoRemakeAnalysisCost(input: VideoRemakeLongAnalysisCostEstimateInput) {
  const sourceAssetId = input.sourceAssetId?.trim() || undefined;
  const targetRatio = input.targetRatio || input.aspectRatio;
  const envelope = await apiRequest<VideoRemakeLongAnalysisCostEstimate>("/api/remake/long-video-cost-estimate", {
    method: "POST",
    body: JSON.stringify({
      analysisEngine: input.analysisEngine || "mock",
      aspectRatio: targetRatio,
      mode: "long_video",
      provider: input.provider,
      sourceAssetId,
      sourceVideoUrl: sourceAssetId ? undefined : input.sourceVideoUrl,
      targetRatio,
    }),
  });

  return normalizeLongAnalysisCostEstimate(envelope.data || envelope);
}

export async function createLongVideoRemakeAnalysis(input: VideoRemakeLongAnalysisCreateInput) {
  const sourceAssetId = input.sourceAssetId?.trim() || undefined;
  const targetRatio = input.targetRatio || input.aspectRatio;
  const envelope = await apiRequest<VideoRemakeLongAnalysisJob>("/api/remake/analyze-long-video", {
    method: "POST",
    body: JSON.stringify({
      analysisEngine: input.analysisEngine || "mock",
      aspectRatio: targetRatio,
      clientRequestId: input.clientRequestId,
      confirmCost: input.confirmCost,
      estimateId: input.estimateId,
      mode: "long_video",
      sourceAssetId,
      sourceVideoUrl: sourceAssetId ? undefined : input.sourceVideoUrl,
      targetRatio,
    }),
  });

  return normalizeLongAnalysisJob(envelope);
}

export async function getLongVideoRemakeAnalysisStatus(analysisJobId: string) {
  const envelope = await apiRequest<VideoRemakeLongAnalysisJob>(`/api/remake/analysis-status/${encodeURIComponent(analysisJobId)}`, {
    method: "GET",
  });

  return normalizeLongAnalysisJob(envelope);
}

export async function createFullEpisodeRemakeAnalysis(input: VideoRemakeFullEpisodeAnalysisCreateInput) {
  const sourceAssetId = input.sourceAssetId?.trim() || undefined;
  const targetRatio = input.targetRatio || input.aspectRatio;
  const envelope = await apiRequest<VideoRemakeFullEpisodeAnalysisJob>("/api/remake/full-episode/analyze", {
    method: "POST",
    body: JSON.stringify({
      aspectRatio: targetRatio,
      clientRequestId: input.clientRequestId,
      mode: "full_episode",
      sourceAssetId,
      sourceVideoUrl: sourceAssetId ? undefined : input.sourceVideoUrl,
      targetRatio,
    }),
  });

  return normalizeFullEpisodeAnalysisJob(envelope);
}

export async function getFullEpisodeRemakeAnalysisStatus(analysisJobId: string) {
  const envelope = await apiRequest<VideoRemakeFullEpisodeAnalysisJob>(`/api/remake/full-episode/status/${encodeURIComponent(analysisJobId)}`, {
    method: "GET",
  });

  return normalizeFullEpisodeStatusResponse(envelope);
}

export async function getVideoModels() {
  const envelope = await apiRequest<{ models: RawModel[] }>("/api/video/models", {
    method: "GET",
  });
  return (envelope.data?.models || []).map(normalizeVideoModel);
}

function assertRemoteMediaUrl(url: string) {
  const value = String(url || "").trim();
  if (!value) return;
  if (value.startsWith("blob:") || value.startsWith("data:")) {
    throw new Error("Local preview media cannot be sent to generation. Please wait for upload to finish.");
  }
}

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {};
}

function pickArray(...values: unknown[]) {
  const array = values.find(Array.isArray);
  return (array || []) as unknown[];
}

function normalizeMediaList(value: unknown): VideoGenerationRequest["mediaList"] {
  return pickArray(value)
    .map((item) => {
      if (typeof item === "string") {
        const url = normalizeMediaAssetUrl(item);
        return {
          type: inferUploadType(url),
          url,
        };
      }

      const raw = asRecord(item);
      const url = normalizeMediaAssetUrl(
        pickString(
          raw.signedUrl,
          raw.signed_url,
          raw.publicUrl,
          raw.public_url,
          raw.mediaUrl,
          raw.media_url,
          raw.imageUrl,
          raw.image_url,
          raw.url,
          raw.uri,
          raw.remoteUri,
          raw.remote_url,
          raw.videoUrl,
          raw.video_url,
          raw.audioUrl,
          raw.audio_url,
          raw.previewUrl,
          raw.preview_url,
        ) || "",
      );
      return {
        id: pickString(raw.id, raw.mediaId, raw.media_id),
        type: inferUploadType(raw.type || raw.mimeType || raw.mime_type || url),
        url,
        role: pickString(raw.role, raw.slot, raw.kind) || "reference",
        duration: Number(raw.duration || 0) || undefined,
        name: pickString(raw.name, raw.filename, raw.originalName),
        mimeType: pickString(raw.mimeType, raw.mime_type),
        size: Number(raw.size || 0) || undefined,
      };
    })
    .filter((item) => item.url);
}

function extractHistoryItems(data: unknown) {
  if (Array.isArray(data)) return data;
  const record = asRecord(data);
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.history)) return record.history;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.data)) return record.data;
  return [];
}

export function normalizeVideoHistoryItem(item: unknown): VideoHistoryItem {
  const record = asRecord(item);
  const rawMeta = asRecord(record.meta);
  const rawMentionBindings =
    record.mentionBindings || record.mention_bindings || rawMeta.mentionBindings || rawMeta.mention_bindings;
  const meta =
    rawMentionBindings && !rawMeta.mentionBindings
      ? {
          ...rawMeta,
          mentionBindings: rawMentionBindings,
        }
      : rawMeta;
  const uploadAssets = asRecord(record.upload_assets || record.uploadAssets || meta.upload_assets || meta.uploadAssets);
  const assets = asRecord(record.assets || meta.assets);
  const outputUrls = pickArray(record.outputUrls, record.output_urls, meta.outputUrls, meta.output_urls)
    .map(String)
    .filter(Boolean);
  const normalizedOutputUrl = getSafeHistoryOutputUrl(record);
  const normalizedThumbnailUrl = getSafeHistoryThumbnailUrl(record);
  const videoUrl =
    pickString(record.videoUrl, record.video_url, record.outputUrl, record.output_url, meta.videoUrl, meta.outputUrl, outputUrls[0], normalizedOutputUrl) || "";
  const firstFrameImage = pickString(
    record.first_frame_image,
    record.firstFrameImage,
    record.firstFrame,
    meta.first_frame_image,
    meta.firstFrameImage,
    uploadAssets.first_frame_image,
    uploadAssets.firstFrameImage,
  );
  const lastFrameImage = pickString(
    record.last_frame_image,
    record.lastFrameImage,
    record.lastFrame,
    meta.last_frame_image,
    meta.lastFrameImage,
    uploadAssets.last_frame_image,
    uploadAssets.lastFrameImage,
  );
  const referenceImages = pickArray(record.reference_images, record.referenceImages, meta.reference_images, meta.referenceImages)
    .map(normalizeMediaAssetUrl)
    .filter(Boolean);
  const referenceVideos = pickArray(record.reference_videos, record.referenceVideos, meta.reference_videos, meta.referenceVideos)
    .map(normalizeMediaAssetUrl)
    .filter(Boolean);
  const referenceAudios = pickArray(record.reference_audios, record.referenceAudios, meta.reference_audios, meta.referenceAudios)
    .map(normalizeMediaAssetUrl)
    .filter(Boolean);
  const mediaList = normalizeMediaList([
    ...pickArray(record.mediaList, meta.mediaList, uploadAssets.media),
    ...(firstFrameImage ? [{ type: "image", url: firstFrameImage, role: "start_frame" }] : []),
    ...(lastFrameImage ? [{ type: "image", url: lastFrameImage, role: "end_frame" }] : []),
    ...referenceImages.map((url) => ({ type: "image", url, role: "reference" })),
    ...referenceVideos.map((url) => ({ type: "video", url, role: "reference" })),
    ...referenceAudios.map((url) => ({ type: "audio", url, role: "reference" })),
    ...pickArray(assets.images).map((url) => ({ type: "image", url, role: "reference" })),
    ...pickArray(assets.videos).map((url) => ({ type: "video", url, role: "reference" })),
    ...pickArray(assets.audios).map((url) => ({ type: "audio", url, role: "reference" })),
    ...pickArray(uploadAssets.images).map((url) => ({ type: "image", url, role: "reference" })),
    ...pickArray(uploadAssets.videos).map((url) => ({ type: "video", url, role: "reference" })),
    ...pickArray(uploadAssets.audios).map((url) => ({ type: "audio", url, role: "reference" })),
    ...pickArray(uploadAssets.reference_images).map((url) => ({ type: "image", url, role: "reference" })),
    ...pickArray(uploadAssets.reference_videos).map((url) => ({ type: "video", url, role: "reference" })),
    ...pickArray(uploadAssets.reference_audios).map((url) => ({ type: "audio", url, role: "reference" })),
  ]);
  const jobId = pickString(record.jobId, record.job_id, record.providerJobId, record.provider_job_id, record.dbJobId, record.id) || "";

  return {
    jobId,
    dbJobId: pickString(record.dbJobId, record.db_job_id, record.id) || null,
    providerJobId: pickString(record.providerJobId, record.provider_job_id) || "",
    status: pickString(record.status, meta.status) || (videoUrl ? "completed" : "unknown"),
    model: pickString(record.model, record.frontendModel, record.frontend_model, meta.frontend_model, meta.model) || "-",
    modelId: pickString(record.modelId, record.model_id, meta.model_id),
    frontendModel: pickString(record.frontendModel, record.frontend_model, meta.frontend_model, record.model),
    providerModel: pickString(record.providerModel, record.provider_model, meta.providerModel, meta.provider_model),
    provider: pickString(record.provider, meta.provider),
    duration: pickString(record.duration, meta.duration),
    ratio: pickString(record.ratio, record.aspect_ratio, meta.ratio, meta.aspect_ratio),
    quality: pickString(record.quality, record.resolution, meta.quality, meta.resolution),
    prompt: pickString(record.prompt, meta.original_prompt, meta.prompt) || "",
    videoUrl,
    outputUrl: pickString(record.outputUrl, record.output_url, meta.outputUrl, meta.output_url),
    outputUrls: outputUrls.length ? outputUrls : videoUrl ? [videoUrl] : [],
    thumbnail: pickString(record.thumbnail, record.thumbnailUrl, record.thumbnail_url, meta.thumbnail, meta.thumbnailUrl, normalizedThumbnailUrl),
    thumbnailUrl: pickString(record.thumbnailUrl, record.thumbnail_url, meta.thumbnailUrl, meta.thumbnail_url, normalizedThumbnailUrl),
    reference_images: referenceImages,
    reference_videos: referenceVideos,
    reference_audios: referenceAudios,
    mediaList,
    error_message: pickString(
      meta.providerPublicMessageEn,
      meta.provider_public_message_en,
      meta.providerPublicMessage,
      meta.provider_public_message,
      meta.errorMessage,
      meta.error_message,
      record.providerPublicMessageEn,
      record.provider_public_message_en,
      record.providerPublicMessage,
      record.provider_public_message,
      record.error_message,
      record.errorMessage,
      record.error,
    ),
    errorCode: pickString(
      meta.providerFailureCategory,
      meta.provider_failure_category,
      meta.error_code,
      meta.errorCode,
      record.providerFailureCategory,
      record.provider_failure_category,
      record.error_code,
      record.errorCode,
    ),
    providerPublicMessage: pickString(meta.providerPublicMessage, meta.provider_public_message, record.providerPublicMessage, record.provider_public_message),
    providerPublicMessageEn: pickString(meta.providerPublicMessageEn, meta.provider_public_message_en, record.providerPublicMessageEn, record.provider_public_message_en),
    providerPublicMessageZh: pickString(meta.providerPublicMessageZh, meta.provider_public_message_zh, record.providerPublicMessageZh, record.provider_public_message_zh),
    providerFailureCategory: pickString(meta.providerFailureCategory, meta.provider_failure_category, record.providerFailureCategory, record.provider_failure_category),
    message: pickString(record.public_message, record.publicMessage, record.message, meta.message),
    cost_credits: Number(record.cost_credits || record.costCredits || meta.cost_credits || 0) || undefined,
    createdAt: pickString(record.createdAt, record.created_at, meta.createdAt, meta.created_at) || Date.now(),
    updatedAt: pickString(record.updatedAt, record.updated_at, meta.updatedAt, meta.updated_at),
    completedAt: pickString(record.completedAt, record.completed_at, meta.completedAt, meta.completed_at),
    first_frame_image: firstFrameImage,
    last_frame_image: lastFrameImage,
    assets,
    upload_assets: uploadAssets,
    meta: {
      ...meta,
      assets,
      first_frame_image: firstFrameImage,
      last_frame_image: lastFrameImage,
      mediaList,
      reference_images: referenceImages,
      reference_videos: referenceVideos,
      reference_audios: referenceAudios,
      upload_assets: uploadAssets,
    },
    retryable: true,
    source: "server",
  };
}

export function normalizeVideoGenerationRequest(request: VideoGenerationRequest): VideoGenerationRequest {
  const referenceImages = (request.reference_images || []).filter(Boolean);
  const referenceVideos = (request.reference_videos || []).filter(Boolean);
  const referenceAudios = (request.reference_audios || []).filter(Boolean);
  const mediaList = (request.mediaList || []).filter((item) => item?.url);

  [...referenceImages, ...referenceVideos, ...referenceAudios, ...mediaList.map((item) => item.url)].forEach(assertRemoteMediaUrl);

  return {
    ...request,
    prompt: String(request.prompt || "").trim(),
    assets: {
      images: (request.assets?.images || []).filter(Boolean),
      videos: (request.assets?.videos || []).filter(Boolean),
      audios: (request.assets?.audios || []).filter(Boolean),
    },
    first_frame_image: request.first_frame_image || "",
    last_frame_image: request.last_frame_image || "",
    reference_images: referenceImages,
    reference_videos: referenceVideos,
    reference_audios: referenceAudios,
    mediaList,
    image: request.image || request.imageUrl || referenceImages[0] || request.assets?.images?.[0] || "",
    imageUrl: request.imageUrl || request.image || referenceImages[0] || request.assets?.images?.[0] || "",
    video: request.video || request.videoUrl || referenceVideos[0] || request.assets?.videos?.[0] || "",
    videoUrl: request.videoUrl || request.video || referenceVideos[0] || request.assets?.videos?.[0] || "",
    upload_assets: {
      media: request.upload_assets?.media || mediaList,
    },
  };
}

export async function generateVideo(request: VideoGenerationRequest) {
  const payload = normalizeVideoGenerationRequest(request);
  return apiRequest<{
    jobId: string;
    providerJobId?: string;
    dbJobId?: string;
    status?: string;
    providerModel?: string;
    provider?: string;
    creditsBalance?: number;
  }>("/api/video/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export const createVideoTask = generateVideo;

export async function getVideoStatus(jobId: string, force = false) {
  const params = new URLSearchParams({ jobId, t: String(Date.now()) });
  if (force) params.set("force", "1");
  return apiRequest<VideoStatusResponse>(`/api/video/status?${params.toString()}`, {
    method: "GET",
  });
}

export async function getVideoHistory(limit = 50) {
  const envelope = await apiRequest<unknown>(`/api/video/history?limit=${limit}&t=${Date.now()}`, {
    method: "GET",
  });

  return extractHistoryItems(envelope.data).map(normalizeVideoHistoryItem);
}

export async function saveVideoHistory(record: VideoHistoryItem) {
  return apiRequest<unknown>("/api/video/history", {
    method: "POST",
    body: JSON.stringify(record),
  });
}

function inferUploadType(value: unknown, fallbackType?: string): UploadMediaType {
  const raw = String(value || fallbackType || "").toLowerCase();
  if (raw.startsWith("video/") || raw.includes("video") || /\.(mp4|mov|webm|m4v)(?:[?#].*)?$/.test(raw)) return "video";
  if (raw.startsWith("audio/") || raw.includes("audio") || /\.(mp3|wav|m4a|aac|ogg)(?:[?#].*)?$/.test(raw)) return "audio";
  return "image";
}

function pickString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}

export function normalizeUploadResponse(payload: unknown, sourceFile?: File): UploadedMediaResponse {
  const envelope = (payload || {}) as {
    data?: Record<string, unknown>;
    url?: unknown;
    mediaUrl?: unknown;
    publicUrl?: unknown;
    fileUrl?: unknown;
    imageUrl?: unknown;
  };
  const data = (envelope.data || envelope || {}) as Record<string, unknown>;
  const url = pickString(
    data.url,
    data.mediaUrl,
    data.media_url,
    data.publicUrl,
    data.public_url,
    data.fileUrl,
    data.file_url,
    data.imageUrl,
    data.image_url,
    envelope.url,
    envelope.mediaUrl,
    envelope.publicUrl,
    envelope.fileUrl,
    envelope.imageUrl,
  );

  if (!url) {
    throw new Error("Upload succeeded but no media URL was returned.");
  }

  const mimeType = pickString(data.mimeType, data.mime_type, data.mimetype, data.type, sourceFile?.type) || "";
  const filename = pickString(data.filename, data.fileName, data.name, sourceFile?.name) || sourceFile?.name || "media";
  const originalName = pickString(data.originalname, data.originalName, sourceFile?.name, filename) || filename;

  return {
    id: pickString(data.id, data.mediaId, data.media_id, data.key, url) || url,
    assetId: pickString(data.assetId, data.asset_id),
    type: inferUploadType(data.type || data.mimeType || data.mimetype, sourceFile?.type),
    name: originalName,
    url,
    size: Number(data.size || data.bytes || sourceFile?.size || 0) || undefined,
    mimeType,
    filename,
    originalName,
    previewUrl: pickString(data.previewUrl, data.preview_url, data.thumbnailUrl, data.thumbnail_url, url) || url,
    duration: Number(data.duration || data.durationSeconds || 0) || undefined,
    raw: payload,
  };
}

export async function uploadMedia(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const envelope = await apiRequest<Record<string, unknown>>("/api/upload-media", {
    method: "POST",
    body: formData,
  });

  return normalizeUploadResponse(envelope, file);
}

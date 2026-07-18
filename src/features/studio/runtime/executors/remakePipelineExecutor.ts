import type {
  NodeExecutionContext,
  NodeExecutionResult,
  StudioNodeExecutor,
} from "@/features/studio/runtime/types";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function failure(code: string, message: string): NodeExecutionResult {
  return {
    status: "failed",
    outputs: {
      executor: "remake_pipeline",
      status: "failed",
      errorCode: code,
      message,
      generationStarted: false,
      providerCallMade: false,
    },
    error: message,
  };
}

function sourceVideoFromContext(context: NodeExecutionContext) {
  const input = Object.entries(context.inputs)
    .map(([sourceNodeId, value]) => ({ sourceNodeId, value: asRecord(value) }))
    .find(
      ({ value }) =>
        value.assetType === "video" && Boolean(stringValue(value.url)),
    );
  if (input) {
    return {
      assetId: stringValue(input.value.assetId),
      sourceNodeId: input.sourceNodeId,
      url: stringValue(input.value.url),
      thumbnail: stringValue(input.value.thumbnail),
    };
  }

  const configured = asRecord(context.config.sourceVideo);
  const url = stringValue(configured.url);
  if (!url) return null;
  return {
    assetId: stringValue(configured.assetId),
    sourceNodeId: stringValue(configured.sourceNodeId),
    url,
    thumbnail: stringValue(configured.thumbnail),
  };
}

function normalizeShot(sourceNodeId: string, input: Record<string, unknown>, index: number) {
  const sourceTimeRange = asRecord(input.sourceTimeRange);
  return {
    sourceNodeId,
    analysisNodeId: stringValue(input.analysisNodeId),
    storyboardId: stringValue(input.storyboardId),
    shotId: stringValue(input.shotId) || `shot-${index + 1}`,
    shotNumber: Math.max(1, Number(input.shotNumber) || index + 1),
    description:
      stringValue(input.description) || `Storyboard shot ${index + 1}`,
    prompt: stringValue(input.prompt),
    duration: Math.max(1, Number(input.duration) || 4),
    camera: stringValue(input.camera),
    referenceFrames: Array.isArray(input.referenceImages)
      ? input.referenceImages.map(String).filter(Boolean)
      : [],
    sourceTimeRange: {
      start: Math.max(0, Number(sourceTimeRange.start) || 0),
      end: Math.max(0, Number(sourceTimeRange.end) || 0),
    },
    model: stringValue(input.model) || "seedance_2_0",
    ratio: stringValue(input.ratio) || "16:9",
    quality: stringValue(input.quality) || "720p",
    status: "ready",
  };
}

export const RemakePipelineExecutor: StudioNodeExecutor = {
  async execute(context) {
    // Preserve the async Runtime contract while keeping this executor local-only.
    await new Promise<void>((resolve) => setTimeout(resolve, 120));

    const sourceVideo = sourceVideoFromContext(context);
    if (!sourceVideo) {
      return failure(
        "REMAKE_PIPELINE_VIDEO_REQUIRED",
        "Connect the Video Asset used by the completed Remake analysis.",
      );
    }

    const inputEntries = Object.entries(context.inputs).map(
      ([sourceNodeId, value]) => ({ sourceNodeId, value: asRecord(value) }),
    );
    const analysis = inputEntries.find(
      ({ value }) =>
        value.executor === "remake_analysis" &&
        value.status === "completed" &&
        Boolean(stringValue(value.storyboardId)),
    );
    if (!analysis) {
      return failure(
        "REMAKE_PIPELINE_ANALYSIS_REQUIRED",
        "Run Remake Analysis first. Pipeline planning never starts VLM analysis itself.",
      );
    }

    const shots = inputEntries
      .filter(({ value }) => value.executor === "remake_shot")
      .sort(
        (left, right) =>
          Number(left.value.shotNumber || 0) - Number(right.value.shotNumber || 0),
      )
      .map(({ sourceNodeId, value }, index) =>
        normalizeShot(sourceNodeId, value, index),
      );
    if (!shots.length) {
      return failure(
        "REMAKE_PIPELINE_SHOTS_REQUIRED",
        "The completed analysis has no Shot Nodes to plan yet.",
      );
    }

    return {
      status: "completed",
      outputs: {
        executor: "remake_pipeline",
        status: "completed",
        sourceVideo,
        analysisNodeId: analysis.sourceNodeId,
        storyboardId: stringValue(analysis.value.storyboardId),
        shots,
        videoNodes: shots.map((shot) => ({
          shotId: shot.shotId,
          status: "idle",
        })),
        timelineClips: shots.map((shot) => ({
          shotId: shot.shotId,
          duration: shot.duration,
          status: "placeholder",
        })),
        shotCount: shots.length,
        videoNodeCount: shots.length,
        timelineClipCount: shots.length,
        confirmationState: "awaiting",
        generationStarted: false,
        providerCallMade: false,
        message: "Remake Plan Ready",
      },
    };
  },
};

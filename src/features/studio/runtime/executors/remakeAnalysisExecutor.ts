import { STUDIO_REMAKE_EXECUTION_ENABLED } from "@/config/studioFeatures";
import type {
  NodeExecutionContext,
  NodeExecutionResult,
  StudioNodeExecutor,
} from "@/features/studio/runtime/types";
import { reverseAnalyzeVideoRemake } from "@/lib/video-api";
import { ApiError } from "@/types/api";

type StudioRemakeErrorCode =
  | "STUDIO_REMAKE_EXECUTION_DISABLED"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "VIDEO_INPUT_REQUIRED"
  | "REMAKE_ANALYSIS_FAILED";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function configString(context: NodeExecutionContext, key: string) {
  return String(context.config[key] || "").trim();
}

function failure(
  code: StudioRemakeErrorCode,
  message: string,
): NodeExecutionResult {
  return {
    status: "failed",
    outputs: {
      executor: "remake_analysis",
      status: "failed",
      errorCode: code,
      message,
      providerCallMade: false,
      vlmCalled: false,
    },
    error: message,
  };
}

function failureFromError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.kind === "auth") {
      return failure(
        "AUTH_REQUIRED",
        "Your session expired. Sign in again before running Remake analysis.",
      );
    }
    if (error.status === 403) {
      return failure(
        "FORBIDDEN",
        "This account does not have permission to run Remake analysis.",
      );
    }
  }
  return failure(
    "REMAKE_ANALYSIS_FAILED",
    error instanceof Error ? error.message : "Remake analysis failed.",
  );
}

function findVideoInput(context: NodeExecutionContext) {
  return Object.values(context.inputs)
    .map(asRecord)
    .find(
      (input) =>
        input.assetType === "video" &&
        typeof input.url === "string" &&
        input.url.trim(),
    );
}

function shotDescription(shot: Record<string, unknown>) {
  return [shot.action, shot.position, shot.motion, shot.emotion]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" · ");
}

function normalizeShot(
  value: unknown,
  storyboardId: string,
  fallbackRatio: string,
) {
  const shot = asRecord(value);
  const generationParams = asRecord(shot.generationParams);
  const sourceTimeRange = asRecord(shot.sourceTimeRange);
  const keyframes = Array.isArray(shot.keyframes)
    ? shot.keyframes.map(asRecord)
    : [];
  const shotNumber = Math.max(1, Number(shot.shot) || 1);
  const shotId =
    String(shot.shotGroupId || "").trim() ||
    `${storyboardId}-shot-${shotNumber}`;

  return {
    shotId,
    shotNumber,
    description: shotDescription(shot) || `Storyboard shot ${shotNumber}`,
    prompt: String(shot.prompt || "").trim(),
    duration:
      Math.max(1, Number(generationParams.duration) || Number(shot.duration) || 4),
    camera: String(shot.camera || "").trim(),
    referenceFrames: keyframes
      .map((frame) => String(frame.url || "").trim())
      .filter(Boolean),
    sourceTimeRange: {
      start: Math.max(0, Number(sourceTimeRange.start) || 0),
      end: Math.max(0, Number(sourceTimeRange.end) || 0),
    },
    model: String(generationParams.modelId || "seedance_2_0"),
    ratio: String(generationParams.ratio || fallbackRatio || "16:9"),
    quality: String(generationParams.quality || "720p"),
    status: "ready" as const,
  };
}

export const RemakeAnalysisExecutor: StudioNodeExecutor = {
  async execute(context) {
    if (
      configString(context, "status") === "completed" &&
      configString(context, "storyboardId")
    ) {
      return {
        status: "completed",
        outputs: {
          executor: "remake_analysis",
          status: "completed",
          storyboardId: configString(context, "storyboardId"),
          analysisSource: configString(context, "analysisSource"),
          shotCount: Number(context.config.shotCount) || 0,
          providerCallMade: context.config.providerCallMade === true,
          vlmCalled: context.config.vlmCalled === true,
          cached: true,
        },
      };
    }

    if (!STUDIO_REMAKE_EXECUTION_ENABLED) {
      return failure(
        "STUDIO_REMAKE_EXECUTION_DISABLED",
        "Studio Remake analysis is disabled. Enable it explicitly before using a potentially paid VLM.",
      );
    }

    const videoInput = findVideoInput(context);
    const sourceVideoUrl = String(videoInput?.url || "").trim();
    if (!sourceVideoUrl) {
      return failure(
        "VIDEO_INPUT_REQUIRED",
        "Connect a ready Video Asset Node before running Remake analysis.",
      );
    }

    try {
      context.reportProgress({
        status: "processing",
        outputs: {
          executor: "remake_analysis",
          status: "processing",
          providerCallMade: false,
          vlmCalled: false,
        },
      });

      const result = await reverseAnalyzeVideoRemake({
        aspectRatio: configString(context, "targetRatio") || "16:9",
        characterRules: configString(context, "characterRules"),
        mode: "single_clip",
        sceneStyle: configString(context, "sceneStyle"),
        sourceFileName: String(videoInput?.name || videoInput?.assetId || "Studio video"),
        sourceLanguage: "zh",
        sourceVideoUrl,
        targetLanguage: "en",
        targetRatio: configString(context, "targetRatio") || "16:9",
        targetRegion:
          (context.config.targetRegion as "US" | "Middle East" | "Japan" | "Southeast Asia") ||
          "US",
        translateDialogue: context.config.translateDialogue !== false,
      });

      const storyboard = result.storyboard;
      const analysisSource = String(
        result.meta?.analysisSource || storyboard.analysisSource || "fallback",
      );
      // The legacy clip endpoint does not consistently expose these booleans.
      // A VLM analysis source is therefore treated as evidence that a call ran.
      const vlmCalled =
        result.meta?.vlmCalled === true ||
        storyboard.vlmCalled === true ||
        analysisSource === "vlm" ||
        analysisSource === "real_vlm" ||
        analysisSource === "sandbox_vlm";
      const providerCallMade =
        result.meta?.providerCallMade === true ||
        storyboard.providerCallMade === true ||
        vlmCalled;
      const shots = storyboard.shots.map((shot) =>
        normalizeShot(shot, storyboard.id, storyboard.targetRatio || "16:9"),
      );

      return {
        status: "completed",
        outputs: {
          executor: "remake_analysis",
          status: "completed",
          storyboardId: storyboard.id,
          analysisSource,
          providerCallMade,
          vlmCalled,
          shotCount: shots.length,
          shots,
        },
      };
    } catch (error) {
      return failureFromError(error);
    }
  },
};

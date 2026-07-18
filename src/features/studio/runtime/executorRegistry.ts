import type {
  NodeExecutionContext,
  NodeExecutionResult,
  StudioExecutorKey,
  StudioExecutorTypeMap,
  StudioNodeExecutor,
} from "@/features/studio/runtime/types";
import { ImageGenerateExecutor } from "@/features/studio/runtime/executors/imageGenerateExecutor";
import { VideoGenerateExecutor } from "@/features/studio/runtime/executors/videoGenerateExecutor";
import { VideoEditExecutor } from "@/features/studio/runtime/executors/videoEditExecutor";
import { MotionControlExecutor } from "@/features/studio/runtime/executors/motionControlExecutor";
import { RemakeAnalysisExecutor } from "@/features/studio/runtime/executors/remakeAnalysisExecutor";
import { RemakePipelineExecutor } from "@/features/studio/runtime/executors/remakePipelineExecutor";
import type { StudioNodeType } from "@/features/studio/types/studioTypes";

const MOCK_EXECUTION_DELAY_MS = 120;

function complete(
  executor: StudioExecutorKey,
  outputs: Record<string, unknown>,
): NodeExecutionResult {
  return {
    status: "completed",
    outputs: {
      mock: true,
      executor,
      ...outputs,
    },
  };
}

async function waitForMockRuntime() {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, MOCK_EXECUTION_DELAY_MS);
  });
}

function configValue(context: NodeExecutionContext, key: string) {
  return context.config[key];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export const AssetExecutor: StudioNodeExecutor = {
  async execute(context) {
    await waitForMockRuntime();
    return complete("asset", {
      assetId: configValue(context, "assetId"),
      assetType: configValue(context, "assetType"),
      url: configValue(context, "url"),
      thumbnail: configValue(context, "thumbnail"),
      source: configValue(context, "source"),
    });
  },
};

export const CharacterExecutor: StudioNodeExecutor = {
  async execute(context) {
    await waitForMockRuntime();
    return complete("character", {
      characterId: context.nodeId,
      name: configValue(context, "name"),
      referenceImages: Array.isArray(context.config.referenceImages)
        ? context.config.referenceImages.map(String).filter(Boolean)
        : [],
      description: configValue(context, "description"),
      style: configValue(context, "style"),
      attributes: asRecord(configValue(context, "attributes")),
      status: "ready",
      providerCalled: false,
    });
  },
};

export const PromptExecutor: StudioNodeExecutor = {
  async execute(context) {
    await waitForMockRuntime();
    const referenceImages = Object.values(context.inputs)
      .map((input) => asRecord(input))
      .filter((input) => input.assetType === "image" && input.url)
      .map((input) => String(input.url));
    return complete("prompt", {
      prompt: configValue(context, "prompt"),
      style: configValue(context, "style"),
      camera: configValue(context, "camera"),
      duration: configValue(context, "duration"),
      ratio: configValue(context, "ratio"),
      referenceImages,
    });
  },
};

export const RemakeShotExecutor: StudioNodeExecutor = {
  async execute(context) {
    await waitForMockRuntime();
    const referenceImages = Array.isArray(context.config.referenceFrames)
      ? context.config.referenceFrames.map(String).filter(Boolean)
      : [];
    return {
      status: "completed",
      outputs: {
        executor: "remake_shot",
        status: "completed",
        analysisNodeId: configValue(context, "analysisNodeId"),
        storyboardId: configValue(context, "storyboardId"),
        shotId: configValue(context, "shotId"),
        shotNumber: configValue(context, "shotNumber"),
        description: configValue(context, "description"),
        prompt: configValue(context, "prompt"),
        camera: configValue(context, "camera"),
        duration: configValue(context, "duration"),
        ratio: configValue(context, "ratio"),
        model: configValue(context, "model"),
        quality: configValue(context, "quality"),
        sourceTimeRange: configValue(context, "sourceTimeRange"),
        referenceImages,
        characterRefs: Array.isArray(context.config.characterRefs)
          ? context.config.characterRefs.map(String).filter(Boolean)
          : [],
      },
    };
  },
};

export const OutputExecutor: StudioNodeExecutor = {
  async execute(context) {
    await waitForMockRuntime();
    const inputs = Object.values(context.inputs).map((input) => asRecord(input));
    const videoOutput = inputs.find(
      (input) => typeof input.videoUrl === "string" && input.videoUrl,
    );
    const imageOutput = inputs.find(
      (input) => typeof input.imageUrl === "string" && input.imageUrl,
    );
    const mediaOutput = videoOutput || imageOutput;
    const failedInput = inputs.find((input) => input.status === "failed");
    if (!mediaOutput && failedInput) {
      const error = String(failedInput.message || "Upstream generation failed.");
      return {
        status: "failed",
        outputs: {
          executor: "output",
          inputNodeIds: Object.keys(context.inputs),
          status: "failed",
          jobId: failedInput.jobId,
          message: error,
        },
        error,
      };
    }
    return {
      status: "completed",
      outputs: {
        mock: !mediaOutput,
        executor: "output",
        inputNodeIds: Object.keys(context.inputs),
        result: videoOutput?.videoUrl || imageOutput?.imageUrl || null,
        videoUrl: videoOutput?.videoUrl || "",
        imageUrl: imageOutput?.imageUrl || "",
        thumbnail:
          mediaOutput?.thumbnail ||
          videoOutput?.videoUrl ||
          imageOutput?.imageUrl ||
          "",
        outputType: videoOutput ? "video" : imageOutput ? "image" : undefined,
        status: mediaOutput?.status,
        jobId: mediaOutput?.jobId,
      },
    };
  },
};

export const executorRegistry = {
  asset: AssetExecutor,
  character: CharacterExecutor,
  prompt: PromptExecutor,
  remake_analysis: RemakeAnalysisExecutor,
  remake_pipeline: RemakePipelineExecutor,
  remake_shot: RemakeShotExecutor,
  image_generate: ImageGenerateExecutor,
  video_generate: VideoGenerateExecutor,
  video_edit: VideoEditExecutor,
  motion_control: MotionControlExecutor,
  output: OutputExecutor,
} satisfies Record<StudioExecutorKey, StudioNodeExecutor>;

export const studioExecutorTypeMap = {
  asset: "asset",
  character: "character",
  prompt: "prompt",
  remakeAnalysis: "remake_analysis",
  remake_pipeline: "remake_pipeline",
  remakeShot: "remake_shot",
  imageGenerate: "image_generate",
  videoGenerate: "video_generate",
  video_edit: "video_edit",
  motion_control: "motion_control",
  output: "output",
} satisfies StudioExecutorTypeMap;

export function getStudioExecutor(type: StudioNodeType) {
  const executorKey = studioExecutorTypeMap[type];
  return {
    executor: executorRegistry[executorKey],
    executorKey,
  };
}

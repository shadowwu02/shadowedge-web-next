import type {
  NodeExecutionContext,
  NodeExecutionResult,
  StudioExecutorKey,
  StudioExecutorTypeMap,
  StudioNodeExecutor,
} from "@/features/studio/runtime/types";
import { ImageGenerateExecutor } from "@/features/studio/runtime/executors/imageGenerateExecutor";
import { VideoGenerateExecutor } from "@/features/studio/runtime/executors/videoGenerateExecutor";
import { RemakeAnalysisExecutor } from "@/features/studio/runtime/executors/remakeAnalysisExecutor";
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
      source: configValue(context, "source"),
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
        shotId: configValue(context, "shotId"),
        prompt: configValue(context, "prompt"),
        camera: configValue(context, "camera"),
        duration: configValue(context, "duration"),
        ratio: configValue(context, "ratio"),
        model: configValue(context, "model"),
        quality: configValue(context, "quality"),
        referenceImages,
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
  prompt: PromptExecutor,
  remake_analysis: RemakeAnalysisExecutor,
  remake_shot: RemakeShotExecutor,
  image_generate: ImageGenerateExecutor,
  video_generate: VideoGenerateExecutor,
  output: OutputExecutor,
} satisfies Record<StudioExecutorKey, StudioNodeExecutor>;

export const studioExecutorTypeMap = {
  asset: "asset",
  prompt: "prompt",
  remakeAnalysis: "remake_analysis",
  remakeShot: "remake_shot",
  imageGenerate: "image_generate",
  videoGenerate: "video_generate",
  output: "output",
} satisfies StudioExecutorTypeMap;

export function getStudioExecutor(type: StudioNodeType) {
  const executorKey = studioExecutorTypeMap[type];
  return {
    executor: executorRegistry[executorKey],
    executorKey,
  };
}

import type {
  NodeExecutionContext,
  NodeExecutionResult,
  StudioExecutorKey,
  StudioExecutorTypeMap,
  StudioNodeExecutor,
} from "@/features/studio/runtime/types";
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
    return complete("prompt", {
      prompt: configValue(context, "prompt"),
      style: configValue(context, "style"),
      camera: configValue(context, "camera"),
      duration: configValue(context, "duration"),
      ratio: configValue(context, "ratio"),
    });
  },
};

export const ImageExecutor: StudioNodeExecutor = {
  async execute(context) {
    await waitForMockRuntime();
    return complete("image_generate", {
      inputNodeIds: Object.keys(context.inputs),
      model: configValue(context, "model"),
      result: null,
    });
  },
};

export const VideoExecutor: StudioNodeExecutor = {
  async execute(context) {
    await waitForMockRuntime();
    return complete("video_generate", {
      inputNodeIds: Object.keys(context.inputs),
      model: configValue(context, "model"),
      result: null,
    });
  },
};

export const OutputExecutor: StudioNodeExecutor = {
  async execute(context) {
    await waitForMockRuntime();
    return complete("output", {
      inputNodeIds: Object.keys(context.inputs),
      result: null,
    });
  },
};

export const executorRegistry = {
  asset: AssetExecutor,
  prompt: PromptExecutor,
  image_generate: ImageExecutor,
  video_generate: VideoExecutor,
  output: OutputExecutor,
} satisfies Record<StudioExecutorKey, StudioNodeExecutor>;

export const studioExecutorTypeMap = {
  asset: "asset",
  prompt: "prompt",
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

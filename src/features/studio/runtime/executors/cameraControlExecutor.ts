import { mockCameraControlProviderAdapter } from "@/features/studio/runtime/providers/cameraControlProviderAdapter";
import { CAMERA_CONTROL_PRESETS } from "@/features/studio/capabilities/studioCapabilities";
import type { CameraControlPreset } from "@/features/studio/types/studioTypes";
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

function findInputs(context: NodeExecutionContext) {
  const inputs = Object.entries(context.inputs).map(([sourceNodeId, input]) => ({
    sourceNodeId,
    input: asRecord(input),
  }));
  const image = inputs.find(
    ({ input }) => input.assetType === "image" && stringValue(input.url),
  );
  const character = inputs.find(
    ({ input }) =>
      input.executor === "character" &&
      Array.isArray(input.referenceImages) &&
      input.referenceImages.some((url) => stringValue(url)),
  );
  const prompt = inputs.find(({ input }) => input.executor === "prompt");
  const characterImage = character && Array.isArray(character.input.referenceImages)
    ? stringValue(character.input.referenceImages[0])
    : "";
  const configuredSource = asRecord(context.config.sourceImage);
  const sourceImageUrl = image
    ? stringValue(image.input.url)
    : characterImage || stringValue(configuredSource.url);
  const sourceNodeId = image?.sourceNodeId || character?.sourceNodeId || stringValue(configuredSource.sourceNodeId);
  return {
    sourceImage: sourceImageUrl
      ? {
          assetId: image
            ? stringValue(image.input.assetId)
            : character
              ? stringValue(character.input.characterId) || character.sourceNodeId
              : stringValue(configuredSource.assetId),
          sourceNodeId,
          url: sourceImageUrl,
          thumbnail: image
            ? stringValue(image.input.thumbnail) || sourceImageUrl
            : stringValue(configuredSource.thumbnail) || sourceImageUrl,
        }
      : null,
    characterIds: character ? [character.sourceNodeId] : [],
    prompt: stringValue(prompt?.input.prompt) || stringValue(context.config.prompt),
  };
}

export const CameraControlExecutor: StudioNodeExecutor = {
  async execute(context): Promise<NodeExecutionResult> {
    const { sourceImage, characterIds, prompt } = findInputs(context);
    if (!sourceImage) {
      const message = "Connect one Character or ready Image Asset.";
      return {
        status: "failed",
        outputs: {
          executor: "camera_control",
          status: "failed",
          errorCode: "CAMERA_CONTROL_INPUT_REQUIRED",
          message,
          mock: true,
          providerCalled: false,
        },
        error: message,
      };
    }

    const configuredPreset = stringValue(context.config.preset);
    const preset: CameraControlPreset = (
      CAMERA_CONTROL_PRESETS as readonly string[]
    ).includes(configuredPreset)
      ? (configuredPreset as CameraControlPreset)
      : "dolly";
    const duration = Math.max(1, Number(context.config.duration) || 4);
    const strengthValue = Number(context.config.strength);
    const strength = Number.isFinite(strengthValue)
      ? Math.min(1, Math.max(0, strengthValue))
      : undefined;
    const submitted = await mockCameraControlProviderAdapter.submit({
      projectId: context.projectId,
      nodeId: context.nodeId,
      sourceImage,
      characterIds,
      preset,
      prompt,
      duration,
      strength,
    });
    context.reportProgress({
      status: "queued",
      outputs: {
        executor: "camera_control",
        status: "queued",
        jobIdentity: submitted.identity,
        ...submitted.identity,
        mock: true,
        providerCalled: false,
      },
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 120));
    context.reportProgress({
      status: "processing",
      outputs: {
        executor: "camera_control",
        status: "processing",
        jobIdentity: submitted.identity,
        ...submitted.identity,
        mock: true,
        providerCalled: false,
      },
    });
    const completed = await mockCameraControlProviderAdapter.status(submitted.identity);
    if (completed.status !== "completed" || !completed.videoUrl) {
      const message = completed.message || "Camera Control mock failed.";
      return {
        status: "failed",
        outputs: {
          executor: "camera_control",
          status: "failed",
          jobIdentity: completed.identity,
          ...completed.identity,
          errorCode: completed.errorCode || "CAMERA_CONTROL_MOCK_FAILED",
          message,
          mock: true,
          providerCalled: false,
        },
        error: message,
      };
    }
    return {
      status: "completed",
      outputs: {
        executor: "camera_control",
        status: "completed",
        type: "video",
        url: completed.videoUrl,
        videoUrl: completed.videoUrl,
        thumbnail: completed.thumbnail || completed.videoUrl,
        source: "generated",
        sourceImage,
        characterIds,
        preset,
        prompt,
        duration,
        strength,
        jobIdentity: completed.identity,
        ...completed.identity,
        mock: true,
        message: "Mock Completed",
        providerCalled: false,
      },
    };
  },
};

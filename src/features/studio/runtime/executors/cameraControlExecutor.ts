import { CAMERA_CONTROL_PRESETS } from "@/features/studio/capabilities/studioCapabilities";
import { resolveProviderForCapability } from "@/features/studio/runtime/providers/providerRegistry";
import {
  getProviderJobStatus,
  submitProviderJob,
} from "@/features/studio/runtime/providers/providerRuntime";
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
    const resolution = resolveProviderForCapability({
      capability: "camera_control",
      providerId: stringValue(context.config.providerId) || undefined,
      mode: "preset",
    });
    if (!resolution.ok) {
      return {
        status: "failed",
        outputs: {
          executor: "camera_control",
          status: "failed",
          errorCode: resolution.error.code,
          message: resolution.error.message,
          mock: true,
          providerCalled: false,
        },
        error: resolution.error.message,
      };
    }
    const submission = await submitProviderJob(resolution, {
      capability: "camera_control",
      projectId: context.projectId,
      nodeId: context.nodeId,
      mode: "preset",
      payload: {
        sourceImage,
        characterIds,
        preset,
        prompt,
        duration,
        strength,
      },
    });
    if (!submission.ok) {
      return {
        status: "failed",
        outputs: {
          executor: "camera_control",
          status: "failed",
          errorCode: submission.error.code,
          message: submission.error.message,
          mock: resolution.adapter.kind === "mock",
          providerCalled: resolution.adapter.kind === "real",
        },
        error: submission.error.message,
      };
    }
    const submitted = submission.result;
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
    const statusResult = await getProviderJobStatus(
      resolution,
      submitted.identity,
    );
    if (!statusResult.ok) {
      return {
        status: "failed",
        outputs: {
          executor: "camera_control",
          status: "failed",
          jobIdentity: submitted.identity,
          ...submitted.identity,
          errorCode: statusResult.error.code,
          message: statusResult.error.message,
          mock: resolution.adapter.kind === "mock",
          providerCalled: resolution.adapter.kind === "real",
        },
        error: statusResult.error.message,
      };
    }
    const completed = statusResult.result;
    const completedVideoUrl = stringValue(completed.output?.videoUrl);
    if (completed.status !== "completed" || !completedVideoUrl) {
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
        url: completedVideoUrl,
        videoUrl: completedVideoUrl,
        thumbnail:
          stringValue(completed.output?.thumbnail) || completedVideoUrl,
        source: "generated",
        sourceImage,
        characterIds,
        preset,
        prompt,
        duration,
        strength,
        jobIdentity: completed.identity,
        ...completed.identity,
        mock: completed.mock,
        message: "Mock Completed",
        providerCalled: completed.providerCalled,
        providerId: resolution.provider.providerId,
        adapterKey: resolution.adapter.key,
      },
    };
  },
};

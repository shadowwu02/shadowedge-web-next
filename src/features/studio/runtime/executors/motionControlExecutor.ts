import { STUDIO_MOTION_CONTROL_EXECUTION_ENABLED } from "@/config/studioFeatures";
import { resolveProviderForCapability } from "@/features/studio/runtime/providers/providerRegistry";
import {
  getProviderJobStatus,
  submitProviderJob,
} from "@/features/studio/runtime/providers/providerRuntime";
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

function assetRef(
  sourceNodeId: string,
  value: Record<string, unknown>,
) {
  return {
    assetId: stringValue(value.assetId),
    sourceNodeId,
    url: stringValue(value.url),
    thumbnail: stringValue(value.thumbnail),
  };
}

function configuredAsset(value: unknown) {
  const record = asRecord(value);
  const url = stringValue(record.url);
  return url
    ? assetRef(stringValue(record.sourceNodeId), record)
    : null;
}

function characterImageRef(
  sourceNodeId: string,
  value: Record<string, unknown>,
) {
  const referenceImages = Array.isArray(value.referenceImages)
    ? value.referenceImages.map(String).filter(Boolean)
    : [];
  const url = referenceImages[0] || "";
  return url
    ? {
        assetId: stringValue(value.characterId) || sourceNodeId,
        sourceNodeId,
        url,
        thumbnail: url,
      }
    : null;
}

function findInputs(context: NodeExecutionContext) {
  const inputs = Object.entries(context.inputs).map(([sourceNodeId, value]) => ({
    sourceNodeId,
    value: asRecord(value),
  }));
  const image = inputs.find(
    ({ value }) => value.assetType === "image" && stringValue(value.url),
  );
  const video = inputs.find(
    ({ value }) => value.assetType === "video" && stringValue(value.url),
  );
  const character = inputs.find(
    ({ value }) => value.executor === "character" &&
      Array.isArray(value.referenceImages) &&
      value.referenceImages.some((url) => stringValue(url)),
  );
  const characterImage = character
    ? characterImageRef(character.sourceNodeId, character.value)
    : null;
  return {
    sourceImage: image
      ? assetRef(image.sourceNodeId, image.value)
      : characterImage
        ? characterImage
        : configuredAsset(context.config.sourceImage),
    motionReferenceVideo: video
      ? assetRef(video.sourceNodeId, video.value)
      : configuredAsset(context.config.motionReferenceVideo),
    characterIds: character ? [character.sourceNodeId] : [],
  };
}

export const MotionControlExecutor: StudioNodeExecutor = {
  async execute(context): Promise<NodeExecutionResult> {
    const { sourceImage, motionReferenceVideo, characterIds } = findInputs(context);
    if (!sourceImage || !motionReferenceVideo) {
      const message =
        "Connect one Character or ready Image Asset and one Motion Reference Video Asset.";
      return {
        status: "failed",
        outputs: {
          executor: "motion_control",
          status: "failed",
          errorCode: "MOTION_CONTROL_INPUT_REQUIRED",
          message,
          mock: true,
          providerCalled: false,
        },
        error: message,
      };
    }

    const configuredMode = stringValue(context.config.mode);
    const mode =
      configuredMode === "camera_motion" ||
      configuredMode === "motion_transfer"
        ? configuredMode
        : "character_motion";
    const resolution = resolveProviderForCapability({
      capability: "motion_control",
      providerId: stringValue(context.config.providerId) || undefined,
      mode,
    });
    if (!resolution.ok) {
      return {
        status: "failed",
        outputs: {
          executor: "motion_control",
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
      capability: "motion_control",
      projectId: context.projectId,
      nodeId: context.nodeId,
      mode,
      payload: {
        providerId: resolution.provider.providerId,
        modelId:
          stringValue(context.config.modelId) ||
          `motion_control:${mode}`,
        duration: Number(context.config.duration) || 3,
        sourceImage,
        motionReferenceVideo,
        prompt: stringValue(context.config.prompt),
      },
    });
    if (!submission.ok) {
      return {
        status: "failed",
        outputs: {
          executor: "motion_control",
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
        executor: "motion_control",
        status: "queued",
        jobIdentity: submitted.identity,
        ...submitted.identity,
        mock: resolution.adapter.kind === "mock",
        providerCalled: resolution.adapter.kind === "real",
      },
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 120));
    context.reportProgress({
      status: "processing",
      outputs: {
        executor: "motion_control",
        status: "processing",
        jobIdentity: submitted.identity,
        ...submitted.identity,
        mock: resolution.adapter.kind === "mock",
        providerCalled: resolution.adapter.kind === "real",
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
          executor: "motion_control",
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
      const message = completed.message || "Motion Control mock failed.";
      return {
        status: "failed",
        outputs: {
          executor: "motion_control",
          status: "failed",
          jobIdentity: completed.identity,
          ...completed.identity,
          errorCode: completed.errorCode || "MOTION_CONTROL_MOCK_FAILED",
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
        executor: "motion_control",
        status: "completed",
        type: "video",
        url: completedVideoUrl,
        videoUrl: completedVideoUrl,
        thumbnail:
          stringValue(completed.output?.thumbnail) || completedVideoUrl,
        source: "generated",
        sourceImage,
        motionReferenceVideo,
        characterIds,
        mode,
        prompt: stringValue(context.config.prompt),
        jobIdentity: completed.identity,
        ...completed.identity,
        mock: completed.mock,
        message: "Mock Completed",
        providerCalled: completed.providerCalled,
        providerId: resolution.provider.providerId,
        adapterKey: resolution.adapter.key,
        providerExecutionEnabled: STUDIO_MOTION_CONTROL_EXECUTION_ENABLED,
      },
    };
  },
};

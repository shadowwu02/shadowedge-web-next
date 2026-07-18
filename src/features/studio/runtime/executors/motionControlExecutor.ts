import { STUDIO_MOTION_CONTROL_EXECUTION_ENABLED } from "@/config/studioFeatures";
import { mockMotionControlProviderAdapter } from "@/features/studio/runtime/providers/motionControlProviderAdapter";
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
  return {
    sourceImage: image
      ? assetRef(image.sourceNodeId, image.value)
      : configuredAsset(context.config.sourceImage),
    motionReferenceVideo: video
      ? assetRef(video.sourceNodeId, video.value)
      : configuredAsset(context.config.motionReferenceVideo),
  };
}

export const MotionControlExecutor: StudioNodeExecutor = {
  async execute(context): Promise<NodeExecutionResult> {
    const { sourceImage, motionReferenceVideo } = findInputs(context);
    if (!sourceImage || !motionReferenceVideo) {
      const message =
        "Connect one ready Image Asset and one Motion Reference Video Asset.";
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
    const submitted = await mockMotionControlProviderAdapter.submit({
      projectId: context.projectId,
      nodeId: context.nodeId,
      sourceImage,
      motionReferenceVideo,
      mode,
      prompt: stringValue(context.config.prompt),
    });
    context.reportProgress({
      status: "queued",
      outputs: {
        executor: "motion_control",
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
        executor: "motion_control",
        status: "processing",
        jobIdentity: submitted.identity,
        ...submitted.identity,
        mock: true,
        providerCalled: false,
      },
    });
    const completed = await mockMotionControlProviderAdapter.status(
      submitted.identity,
    );
    if (completed.status !== "completed" || !completed.videoUrl) {
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
        url: completed.videoUrl,
        videoUrl: completed.videoUrl,
        thumbnail: completed.thumbnail || completed.videoUrl,
        source: "generated",
        sourceImage,
        motionReferenceVideo,
        mode,
        prompt: stringValue(context.config.prompt),
        jobIdentity: completed.identity,
        ...completed.identity,
        mock: true,
        message: "Mock Completed",
        providerCalled: false,
        providerExecutionEnabled: STUDIO_MOTION_CONTROL_EXECUTION_ENABLED,
      },
    };
  },
};

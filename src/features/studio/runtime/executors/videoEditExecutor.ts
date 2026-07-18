import { STUDIO_VIDEO_EDIT_EXECUTION_ENABLED } from "@/config/studioFeatures";
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

function findSourceVideo(context: NodeExecutionContext) {
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

export const VideoEditExecutor: StudioNodeExecutor = {
  async execute(context): Promise<NodeExecutionResult> {
    const sourceVideo = findSourceVideo(context);
    if (!sourceVideo) {
      const message = "Connect a ready Video Asset before running Video Edit.";
      return {
        status: "failed",
        outputs: {
          executor: "video_edit",
          status: "failed",
          errorCode: "VIDEO_EDIT_SOURCE_REQUIRED",
          message,
          mock: true,
          providerCalled: false,
        },
        error: message,
      };
    }

    const mode = stringValue(context.config.mode) || "video_to_video";
    const parameters = asRecord(context.config.parameters);
    const normalizedMode =
      mode === "replace_background" || mode === "extend"
        ? mode
        : "video_to_video";
    const resolution = resolveProviderForCapability({
      capability: "video_edit",
      providerId: stringValue(context.config.providerId) || undefined,
      mode: normalizedMode,
    });
    if (!resolution.ok) {
      return {
        status: "failed",
        outputs: {
          executor: "video_edit",
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
      capability: "video_edit",
      projectId: context.projectId,
      nodeId: context.nodeId,
      mode: normalizedMode,
      payload: {
        sourceVideo,
        prompt: stringValue(context.config.prompt),
        parameters,
      },
    });
    if (!submission.ok) {
      return {
        status: "failed",
        outputs: {
          executor: "video_edit",
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
        executor: "video_edit",
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
        executor: "video_edit",
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
          executor: "video_edit",
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
      const message = completed.message || "The mock Video Edit job failed.";
      return {
        status: "failed",
        outputs: {
          executor: "video_edit",
          status: "failed",
          jobIdentity: completed.identity,
          ...completed.identity,
          errorCode: completed.errorCode || "VIDEO_EDIT_MOCK_FAILED",
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
        executor: "video_edit",
        status: "completed",
        type: "video",
        url: completedVideoUrl,
        videoUrl: completedVideoUrl,
        thumbnail:
          stringValue(completed.output?.thumbnail) || completedVideoUrl,
        source: "generated",
        sourceVideo,
        mode: normalizedMode,
        prompt: stringValue(context.config.prompt),
        parameters,
        jobIdentity: completed.identity,
        ...completed.identity,
        mock: completed.mock,
        message: "Mock Completed",
        providerCalled: completed.providerCalled,
        providerId: resolution.provider.providerId,
        adapterKey: resolution.adapter.key,
        providerExecutionEnabled: STUDIO_VIDEO_EDIT_EXECUTION_ENABLED,
      },
    };
  },
};

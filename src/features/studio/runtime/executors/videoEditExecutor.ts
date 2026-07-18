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

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function findSourceVideo(context: NodeExecutionContext) {
  const input = Object.entries(context.inputs)
    .map(([sourceNodeId, value]) => ({ sourceNodeId, value: asRecord(value) }))
    .find(
      ({ value }) =>
        value.assetType === "video" && Boolean(stringValue(value.url)),
    );
  if (input) {
    const metadata = asRecord(input.value.metadata);
    return {
      assetId: stringValue(input.value.assetId),
      sourceNodeId: input.sourceNodeId,
      url: stringValue(input.value.url),
      thumbnail: stringValue(input.value.thumbnail),
      mimeType: stringValue(input.value.mimeType || metadata.mimeType),
      sizeBytes: numberValue(
        input.value.sizeBytes ||
          input.value.fileSizeBytes ||
          metadata.sizeBytes ||
          metadata.fileSizeBytes,
      ),
      duration: numberValue(input.value.duration || metadata.duration),
      metadata,
    };
  }

  const configured = asRecord(context.config.sourceVideo);
  const url = stringValue(configured.url);
  if (!url) return null;
  const metadata = asRecord(configured.metadata);
  return {
    assetId: stringValue(configured.assetId),
    sourceNodeId: stringValue(configured.sourceNodeId),
    url,
    thumbnail: stringValue(configured.thumbnail),
    mimeType: stringValue(configured.mimeType || metadata.mimeType),
    sizeBytes: numberValue(
      configured.sizeBytes ||
        configured.fileSizeBytes ||
        metadata.sizeBytes ||
        metadata.fileSizeBytes,
    ),
    duration: numberValue(configured.duration || metadata.duration),
    metadata,
  };
}

function findPromptInput(context: NodeExecutionContext) {
  const input = Object.values(context.inputs)
    .map(asRecord)
    .find((value) => value.executor === "prompt");
  return input || {};
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
    const promptInput = findPromptInput(context);
    const prompt =
      stringValue(promptInput.prompt) || stringValue(context.config.prompt);
    const duration = numberValue(
      context.config.duration || parameters.duration || promptInput.duration,
    );
    const ratio = stringValue(
      context.config.ratio || parameters.ratio || promptInput.ratio,
    );
    const model = stringValue(context.config.model || parameters.model);
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
        prompt,
        duration,
        ratio,
        model,
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
        mock: submitted.mock,
        providerCalled: submitted.providerCalled,
        providerId: resolution.provider.providerId,
        adapterKey: resolution.adapter.key,
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
        mock: submitted.mock,
        providerCalled: submitted.providerCalled,
        providerId: resolution.provider.providerId,
        adapterKey: resolution.adapter.key,
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
      const message = completed.message || "The Video Edit provider job failed.";
      return {
        status: "failed",
        outputs: {
          executor: "video_edit",
          status: "failed",
          jobIdentity: completed.identity,
          ...completed.identity,
          errorCode: completed.errorCode || "PROVIDER_JOB_FAILED",
          message,
          mock: completed.mock,
          providerCalled: completed.providerCalled,
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
        prompt,
        duration,
        ratio,
        model,
        parameters,
        jobIdentity: completed.identity,
        ...completed.identity,
        mock: completed.mock,
        message: completed.message || "Completed",
        providerCalled: completed.providerCalled,
        providerId: resolution.provider.providerId,
        adapterKey: resolution.adapter.key,
        providerExecutionEnabled: STUDIO_VIDEO_EDIT_EXECUTION_ENABLED,
      },
    };
  },
};

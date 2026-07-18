import { STUDIO_VIDEO_EDIT_EXECUTION_ENABLED } from "@/config/studioFeatures";
import { mockVideoEditProviderAdapter } from "@/features/studio/runtime/providers/videoEditProviderAdapter";
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
    const submitted = await mockVideoEditProviderAdapter.submit({
      projectId: context.projectId,
      nodeId: context.nodeId,
      sourceVideo,
      mode:
        mode === "replace_background" || mode === "extend"
          ? mode
          : "video_to_video",
      prompt: stringValue(context.config.prompt),
      parameters,
    });
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
    const completed = await mockVideoEditProviderAdapter.status(
      submitted.identity,
    );
    if (completed.status !== "completed" || !completed.videoUrl) {
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
        url: completed.videoUrl,
        videoUrl: completed.videoUrl,
        thumbnail: completed.thumbnail || completed.videoUrl,
        source: "generated",
        sourceVideo,
        mode,
        prompt: stringValue(context.config.prompt),
        parameters,
        jobIdentity: completed.identity,
        ...completed.identity,
        mock: true,
        message: "Mock Completed",
        providerCalled: false,
        providerExecutionEnabled: STUDIO_VIDEO_EDIT_EXECUTION_ENABLED,
      },
    };
  },
};

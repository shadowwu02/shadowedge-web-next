import { STUDIO_VIDEO_EDIT_ENABLED } from "@/config/studioFeatures";
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
    // Keep the asynchronous contract visible without touching an API or provider.
    await new Promise<void>((resolve) => setTimeout(resolve, 120));
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

    const jobId = `mock-video-edit-${context.nodeId}`;
    return {
      status: "completed",
      outputs: {
        executor: "video_edit",
        status: "completed",
        type: "video",
        url: sourceVideo.url,
        videoUrl: sourceVideo.url,
        thumbnail: sourceVideo.thumbnail || sourceVideo.url,
        source: "generated",
        sourceVideo,
        mode: stringValue(context.config.mode) || "video_to_video",
        prompt: stringValue(context.config.prompt),
        jobId,
        mock: true,
        message: "Mock Completed",
        providerCalled: false,
        providerExecutionEnabled: STUDIO_VIDEO_EDIT_ENABLED,
      },
    };
  },
};

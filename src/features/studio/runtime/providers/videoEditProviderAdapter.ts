import type { VideoJobIdentity } from "@/lib/video/videoJobIdentity";

export type VideoEditMode =
  | "video_to_video"
  | "replace_background"
  | "extend";

export type VideoEditProviderInput = {
  projectId: string | null;
  nodeId: string;
  sourceVideo: {
    assetId: string;
    sourceNodeId: string;
    url: string;
    thumbnail: string;
  };
  mode: VideoEditMode;
  prompt: string;
  parameters: Record<string, unknown>;
};

export type VideoEditProviderResult = {
  identity: VideoJobIdentity & { clientJobId: string };
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  videoUrl?: string;
  thumbnail?: string;
  errorCode?: string;
  message?: string;
  mock: boolean;
  providerCalled: boolean;
};

export interface VideoEditProviderAdapter {
  readonly key: string;
  submit(input: VideoEditProviderInput): Promise<VideoEditProviderResult>;
  status(identity: VideoEditProviderResult["identity"]): Promise<VideoEditProviderResult>;
  cancel(identity: VideoEditProviderResult["identity"]): Promise<VideoEditProviderResult>;
}

function mockIdentity(nodeId: string): VideoEditProviderResult["identity"] {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const clientJobId = `mock-edit-client-${nodeId}-${suffix}`;
  const databaseJobId = `mock-edit-db-${nodeId}-${suffix}`;
  const providerJobId = `mock-edit-provider-${nodeId}-${suffix}`;
  return {
    jobId: clientJobId,
    clientJobId,
    databaseJobId,
    providerJobId,
    statusJobId: databaseJobId,
  };
}

/**
 * Local-only adapter used by P2-A1. It has no HTTP client and therefore cannot
 * submit provider work or charge credits.
 */
export function createMockVideoEditProviderAdapter(): VideoEditProviderAdapter {
  const jobs = new Map<
    string,
    { input: VideoEditProviderInput; result: VideoEditProviderResult }
  >();

  return {
    key: "mock",
    async submit(input) {
      const identity = mockIdentity(input.nodeId);
      const result: VideoEditProviderResult = {
        identity,
        status: "queued",
        mock: true,
        providerCalled: false,
      };
      jobs.set(identity.statusJobId, { input, result });
      return result;
    },
    async status(identity) {
      const job = jobs.get(identity.statusJobId);
      if (!job) {
        return {
          identity,
          status: "failed",
          errorCode: "VIDEO_EDIT_JOB_NOT_FOUND",
          message: "The local mock edit job could not be found.",
          mock: true,
          providerCalled: false,
        };
      }
      const result: VideoEditProviderResult = {
        identity,
        status: "completed",
        videoUrl: job.input.sourceVideo.url,
        thumbnail:
          job.input.sourceVideo.thumbnail || job.input.sourceVideo.url,
        mock: true,
        providerCalled: false,
      };
      jobs.set(identity.statusJobId, { ...job, result });
      return result;
    },
    async cancel(identity) {
      const job = jobs.get(identity.statusJobId);
      const result: VideoEditProviderResult = {
        identity,
        status: "cancelled",
        mock: true,
        providerCalled: false,
      };
      if (job) jobs.set(identity.statusJobId, { ...job, result });
      return result;
    },
  };
}

export const mockVideoEditProviderAdapter =
  createMockVideoEditProviderAdapter();

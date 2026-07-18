import type { VideoJobIdentity } from "@/lib/video/videoJobIdentity";

export type MotionControlProviderInput = {
  projectId: string | null;
  nodeId: string;
  sourceImage: {
    assetId: string;
    sourceNodeId: string;
    url: string;
    thumbnail: string;
  };
  motionReferenceVideo: {
    assetId: string;
    sourceNodeId: string;
    url: string;
    thumbnail: string;
  };
  mode: "character_motion" | "camera_motion" | "motion_transfer";
  prompt: string;
};

export type MotionControlProviderResult = {
  identity: VideoJobIdentity & { clientJobId: string };
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  videoUrl?: string;
  thumbnail?: string;
  errorCode?: string;
  message?: string;
  mock: boolean;
  providerCalled: boolean;
};

export interface MotionControlProviderAdapter {
  readonly key: string;
  submit(input: MotionControlProviderInput): Promise<MotionControlProviderResult>;
  status(
    identity: MotionControlProviderResult["identity"],
  ): Promise<MotionControlProviderResult>;
  cancel(
    identity: MotionControlProviderResult["identity"],
  ): Promise<MotionControlProviderResult>;
}

function createMockIdentity(
  nodeId: string,
): MotionControlProviderResult["identity"] {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const clientJobId = `mock-motion-client-${nodeId}-${suffix}`;
  const databaseJobId = `mock-motion-db-${nodeId}-${suffix}`;
  const providerJobId = `mock-motion-provider-${nodeId}-${suffix}`;
  return {
    jobId: clientJobId,
    clientJobId,
    databaseJobId,
    providerJobId,
    statusJobId: databaseJobId,
  };
}

/** Local-only P2-A2 adapter. It has no HTTP client or provider credentials. */
export function createMockMotionControlProviderAdapter(): MotionControlProviderAdapter {
  const jobs = new Map<
    string,
    { input: MotionControlProviderInput; result: MotionControlProviderResult }
  >();

  return {
    key: "mock",
    async submit(input) {
      const identity = createMockIdentity(input.nodeId);
      const result: MotionControlProviderResult = {
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
          errorCode: "MOTION_CONTROL_JOB_NOT_FOUND",
          message: "The local Motion Control mock job could not be found.",
          mock: true,
          providerCalled: false,
        };
      }
      const result: MotionControlProviderResult = {
        identity,
        status: "completed",
        // The reference video is intentionally passed through for a visible,
        // deterministic mock result without generating new media.
        videoUrl: job.input.motionReferenceVideo.url,
        thumbnail:
          job.input.motionReferenceVideo.thumbnail ||
          job.input.sourceImage.thumbnail ||
          job.input.sourceImage.url,
        mock: true,
        providerCalled: false,
      };
      jobs.set(identity.statusJobId, { ...job, result });
      return result;
    },
    async cancel(identity) {
      const job = jobs.get(identity.statusJobId);
      const result: MotionControlProviderResult = {
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

export const mockMotionControlProviderAdapter =
  createMockMotionControlProviderAdapter();

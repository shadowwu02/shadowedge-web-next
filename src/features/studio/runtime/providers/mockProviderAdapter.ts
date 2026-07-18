import {
  normalizeProviderError,
  type ProviderAdapter,
  type ProviderJobIdentity,
  type ProviderJobResult,
  type ProviderSubmitRequest,
} from "./providerAdapter.ts";

type StoredMockJob = {
  request: ProviderSubmitRequest;
  result: ProviderJobResult;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function createMockIdentity(nodeId: string): ProviderJobIdentity {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const clientJobId = `mock-client-${nodeId}-${suffix}`;
  const databaseJobId = `mock-db-${nodeId}-${suffix}`;
  const providerJobId = `mock-provider-${nodeId}-${suffix}`;
  return {
    jobId: clientJobId,
    clientJobId,
    databaseJobId,
    providerJobId,
    statusJobId: databaseJobId,
  };
}

function completedOutput(request: ProviderSubmitRequest) {
  const sourceVideo = asRecord(request.payload.sourceVideo);
  const motionReferenceVideo = asRecord(request.payload.motionReferenceVideo);
  const sourceImage = asRecord(request.payload.sourceImage);

  if (request.capability === "video_edit") {
    const videoUrl = stringValue(sourceVideo.url);
    return {
      type: "video",
      videoUrl,
      url: videoUrl,
      thumbnail: stringValue(sourceVideo.thumbnail) || videoUrl,
    };
  }
  if (request.capability === "motion_control") {
    const videoUrl = stringValue(motionReferenceVideo.url);
    return {
      type: "video",
      videoUrl,
      url: videoUrl,
      thumbnail:
        stringValue(motionReferenceVideo.thumbnail) ||
        stringValue(sourceImage.thumbnail) ||
        stringValue(sourceImage.url),
    };
  }

  // Camera Control intentionally returns the source image as a deterministic
  // mock reference. It is not generated or playable video media.
  const videoUrl = stringValue(sourceImage.url);
  return {
    type: "video",
    videoUrl,
    url: videoUrl,
    thumbnail: stringValue(sourceImage.thumbnail) || videoUrl,
  };
}

export function createMockProviderAdapter(): ProviderAdapter {
  const jobs = new Map<string, StoredMockJob>();

  return {
    key: "mock_provider",
    providerId: "mock",
    kind: "mock",
    capabilities: ["video_edit", "motion_control", "camera_control"],
    normalizeError: (error) => normalizeProviderError(error),
    async submit(request) {
      if (!this.capabilities.includes(request.capability)) {
        const error = normalizeProviderError({
          code: "CAPABILITY_PROVIDER_UNAVAILABLE",
          message: `Mock provider does not support ${request.capability}.`,
        });
        throw Object.assign(new Error(error.message), error);
      }
      const identity = createMockIdentity(request.nodeId);
      const result: ProviderJobResult = {
        identity,
        status: "queued",
        mock: true,
        providerCalled: false,
      };
      jobs.set(identity.statusJobId, { request, result });
      return result;
    },
    async status(identity) {
      const job = jobs.get(identity.statusJobId);
      if (!job) {
        return {
          identity,
          status: "failed",
          errorCode: "PROVIDER_JOB_NOT_FOUND",
          message: "The local mock provider job could not be found.",
          mock: true,
          providerCalled: false,
        };
      }
      if (job.result.status === "cancelled") return job.result;
      const result: ProviderJobResult = {
        identity,
        status: "completed",
        output: completedOutput(job.request),
        message: "Mock Completed",
        mock: true,
        providerCalled: false,
      };
      jobs.set(identity.statusJobId, { ...job, result });
      return result;
    },
    async cancel(identity) {
      const job = jobs.get(identity.statusJobId);
      const result: ProviderJobResult = {
        identity,
        status: "cancelled",
        errorCode: "PROVIDER_CANCELLED",
        message: "Mock job cancelled.",
        mock: true,
        providerCalled: false,
      };
      if (job) jobs.set(identity.statusJobId, { ...job, result });
      return result;
    },
  };
}

export const mockProviderAdapter = createMockProviderAdapter();

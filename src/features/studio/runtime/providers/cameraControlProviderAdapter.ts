import type { CameraControlConfig } from "@/features/studio/types/studioTypes";
import type { VideoJobIdentity } from "@/lib/video/videoJobIdentity";

export type CameraControlProviderInput = CameraControlConfig & {
  projectId: string | null;
  nodeId: string;
  sourceImage: {
    assetId: string;
    sourceNodeId: string;
    url: string;
    thumbnail: string;
  };
  characterIds: string[];
};

export type CameraControlProviderResult = {
  identity: VideoJobIdentity & { clientJobId: string };
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  videoUrl?: string;
  thumbnail?: string;
  errorCode?: string;
  message?: string;
  mock: boolean;
  providerCalled: boolean;
};

export interface CameraControlProviderAdapter {
  readonly key: string;
  submit(input: CameraControlProviderInput): Promise<CameraControlProviderResult>;
  status(identity: CameraControlProviderResult["identity"]): Promise<CameraControlProviderResult>;
  cancel(identity: CameraControlProviderResult["identity"]): Promise<CameraControlProviderResult>;
}

function createMockIdentity(nodeId: string): CameraControlProviderResult["identity"] {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const clientJobId = `mock-camera-client-${nodeId}-${suffix}`;
  const databaseJobId = `mock-camera-db-${nodeId}-${suffix}`;
  const providerJobId = `mock-camera-provider-${nodeId}-${suffix}`;
  return {
    jobId: clientJobId,
    clientJobId,
    databaseJobId,
    providerJobId,
    statusJobId: databaseJobId,
  };
}

/** Local-only adapter with no HTTP client, provider credentials, or credits. */
export function createMockCameraControlProviderAdapter(): CameraControlProviderAdapter {
  const jobs = new Map<string, CameraControlProviderInput>();
  return {
    key: "mock",
    async submit(input) {
      const identity = createMockIdentity(input.nodeId);
      jobs.set(identity.statusJobId, input);
      return { identity, status: "queued", mock: true, providerCalled: false };
    },
    async status(identity) {
      const input = jobs.get(identity.statusJobId);
      if (!input) {
        return {
          identity,
          status: "failed",
          errorCode: "CAMERA_CONTROL_JOB_NOT_FOUND",
          message: "The local Camera Control mock job could not be found.",
          mock: true,
          providerCalled: false,
        };
      }
      return {
        identity,
        status: "completed",
        // P2-A4 deliberately reuses the image URL as a deterministic mock
        // result reference. It is not a generated or playable video.
        videoUrl: input.sourceImage.url,
        thumbnail: input.sourceImage.thumbnail || input.sourceImage.url,
        message: "Mock Completed",
        mock: true,
        providerCalled: false,
      };
    },
    async cancel(identity) {
      return { identity, status: "cancelled", mock: true, providerCalled: false };
    },
  };
}

export const mockCameraControlProviderAdapter =
  createMockCameraControlProviderAdapter();

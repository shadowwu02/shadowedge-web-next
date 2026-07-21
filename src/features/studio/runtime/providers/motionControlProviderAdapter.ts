import { createMockProviderAdapter } from "./mockProviderAdapter.ts";
import { STUDIO_MOTION_PROVIDER_ENABLED } from "../../../../config/studioFeatures.ts";
import type {
  NormalizedProviderError,
  ProviderAdapter,
  ProviderJobIdentity,
  ProviderJobResult,
  ProviderJobStatus,
  ProviderSubmitRequest,
} from "./providerAdapter.ts";
import { normalizeProviderError } from "./providerAdapter.ts";
import { createMotionControlApiTransport } from "./motionControlApiTransport.ts";

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
  duration?: number;
  modelId?: string;
};

export type MotionControlBridgePayload = {
  capability: "motion_control";
  providerId: string;
  projectId: string | null;
  nodeId: string;
  modelId: string;
  mode: "character_motion" | "camera_motion" | "motion_transfer";
  prompt: string;
  duration: number;
  characterImage: MotionControlProviderInput["sourceImage"];
  motionReferenceVideo: MotionControlProviderInput["motionReferenceVideo"];
};

export type MotionControlTransportResult = {
  clientJobId?: string;
  databaseJobId: string;
  providerJobId: string;
  statusJobId?: string;
  status: ProviderJobStatus;
  videoUrl?: string;
  thumbnail?: string;
  errorCode?: string;
  errorMessage?: string;
};

export interface MotionControlTransport {
  submit(payload: MotionControlBridgePayload): Promise<MotionControlTransportResult>;
  status(statusJobId: string): Promise<MotionControlTransportResult>;
  cancel(statusJobId: string): Promise<MotionControlTransportResult>;
}

export type MotionControlProviderResult = {
  identity: ProviderJobIdentity;
  status: ProviderJobResult["status"];
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
  status(identity: ProviderJobIdentity): Promise<MotionControlProviderResult>;
  cancel(identity: ProviderJobIdentity): Promise<MotionControlProviderResult>;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function bridgeError(message: string, code: string, status?: number) {
  return Object.assign(new Error(message), { code, status });
}

function normalizeIdentity(
  result: MotionControlTransportResult,
  fallback?: ProviderJobIdentity,
): ProviderJobIdentity {
  const databaseJobId = result.databaseJobId || fallback?.databaseJobId || "";
  const providerJobId = result.providerJobId || fallback?.providerJobId || "";
  const clientJobId = result.clientJobId || fallback?.clientJobId || databaseJobId;
  const statusJobId = result.statusJobId || fallback?.statusJobId || databaseJobId;
  if (!databaseJobId || !providerJobId || !statusJobId) {
    throw bridgeError(
      "Motion Control response did not include complete Job Identity.",
      "PROVIDER_JOB_ID_MISSING_AFTER_SUBMIT",
      502,
    );
  }
  return {
    jobId: clientJobId,
    clientJobId,
    databaseJobId,
    providerJobId,
    statusJobId,
  };
}

function providerResult(
  result: MotionControlTransportResult,
  fallback?: ProviderJobIdentity,
): ProviderJobResult {
  const identity = normalizeIdentity(result, fallback);
  return {
    identity,
    status: result.status,
    ...(result.videoUrl
      ? {
          output: {
            type: "video",
            url: result.videoUrl,
            videoUrl: result.videoUrl,
            thumbnail: result.thumbnail || result.videoUrl,
          },
        }
      : {}),
    ...(result.errorCode
      ? { errorCode: normalizeMotionControlProviderError(result).code }
      : {}),
    ...(result.errorMessage ? { message: result.errorMessage } : {}),
    mock: false,
    providerCalled: true,
  };
}

function mapBridgePayload(request: ProviderSubmitRequest): MotionControlBridgePayload {
  const sourceImage = recordValue(request.payload.sourceImage);
  const motionReferenceVideo = recordValue(request.payload.motionReferenceVideo);
  const mode = request.mode;
  if (
    mode !== "character_motion" &&
    mode !== "motion_transfer" &&
    mode !== "camera_motion"
  ) {
    throw bridgeError("Unsupported Motion Control mode.", "PROVIDER_INVALID_INPUT", 422);
  }
  const modelId = stringValue(request.payload.modelId)?.trim() || "";
  const duration = numberValue(request.payload.duration);
  const sourceImageUrl = stringValue(sourceImage.url)?.trim() || "";
  const motionVideoUrl = stringValue(motionReferenceVideo.url)?.trim() || "";
  if (!request.projectId || !modelId || !duration || !sourceImageUrl || !motionVideoUrl) {
    throw bridgeError(
      "Project, model, duration, Character Image, and Motion Reference Video are required.",
      "PROVIDER_INVALID_INPUT",
      422,
    );
  }
  return {
    capability: "motion_control",
    providerId: stringValue(request.payload.providerId)?.trim() || "future",
    projectId: request.projectId,
    nodeId: request.nodeId,
    modelId,
    mode,
    prompt: stringValue(request.payload.prompt)?.trim() || "",
    duration,
    characterImage: {
      assetId: stringValue(sourceImage.assetId)?.trim() || "",
      sourceNodeId: stringValue(sourceImage.sourceNodeId)?.trim() || "",
      url: sourceImageUrl,
      thumbnail: stringValue(sourceImage.thumbnail)?.trim() || sourceImageUrl,
    },
    motionReferenceVideo: {
      assetId: stringValue(motionReferenceVideo.assetId)?.trim() || "",
      sourceNodeId: stringValue(motionReferenceVideo.sourceNodeId)?.trim() || "",
      url: motionVideoUrl,
      thumbnail:
        stringValue(motionReferenceVideo.thumbnail)?.trim() || motionVideoUrl,
    },
  };
}

export function normalizeMotionControlProviderError(
  error: unknown,
): NormalizedProviderError {
  const candidate = recordValue(error);
  return normalizeProviderError({
    status: candidate.status || candidate.statusCode,
    code: candidate.errorCode || candidate.code,
    message:
      candidate.errorMessage ||
      candidate.message ||
      (error instanceof Error ? error.message : ""),
  });
}

export function createMotionControlBridgeAdapter(options: {
  transport?: MotionControlTransport;
  enabled?: boolean;
} = {}): ProviderAdapter {
  const transport = options.transport;
  const enabled = options.enabled ?? STUDIO_MOTION_PROVIDER_ENABLED;
  const requireTransport = () => {
    if (!enabled || !transport) {
      throw bridgeError(
        "Studio Motion Control provider execution is disabled.",
        "PROVIDER_EXECUTION_DISABLED",
      );
    }
    return transport;
  };
  return {
    key: "motion_control_bridge",
    providerId: "future",
    kind: "real",
    capabilities: ["motion_control"],
    normalizeError: normalizeMotionControlProviderError,
    estimateCost(request) {
      return {
        providerId: "future",
        capability: request.capability,
        modelId: stringValue(request.modelId) || null,
        amount: null,
        currency: "unknown",
        status: "UNKNOWN",
        source: "provider_cost_not_configured",
      };
    },
    async submit(request) {
      return providerResult(await requireTransport().submit(mapBridgePayload(request)));
    },
    async status(identity) {
      return providerResult(
        await requireTransport().status(identity.statusJobId),
        identity,
      );
    },
    async cancel(identity) {
      return providerResult(
        await requireTransport().cancel(identity.statusJobId),
        identity,
      );
    },
  };
}

function legacyResult(result: ProviderJobResult): MotionControlProviderResult {
  return {
    identity: result.identity,
    status: result.status,
    videoUrl: stringValue(result.output?.videoUrl),
    thumbnail: stringValue(result.output?.thumbnail),
    errorCode: result.errorCode,
    message: result.message,
    mock: result.mock,
    providerCalled: result.providerCalled,
  };
}

/** @deprecated Use Provider Registry + ProviderAdapter Runtime for new code. */
export function createMockMotionControlProviderAdapter(): MotionControlProviderAdapter {
  const adapter = createMockProviderAdapter();
  return {
    key: adapter.key,
    async submit(input) {
      return legacyResult(
        await adapter.submit({
          capability: "motion_control",
          projectId: input.projectId,
          nodeId: input.nodeId,
          mode: input.mode,
          payload: {
            sourceImage: input.sourceImage,
            motionReferenceVideo: input.motionReferenceVideo,
            prompt: input.prompt,
          },
        }),
      );
    },
    async status(identity) {
      return legacyResult(await adapter.status(identity));
    },
    async cancel(identity) {
      return legacyResult(await adapter.cancel(identity));
    },
  };
}

export const mockMotionControlProviderAdapter =
  createMockMotionControlProviderAdapter();

export const motionControlBridgeAdapter = createMotionControlBridgeAdapter(
  { transport: createMotionControlApiTransport() },
);

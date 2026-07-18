import {
  HIGGSFIELD_VIDEO_EDIT_CONFIG,
  isHiggsfieldVideoEditConfigReady,
  type HiggsfieldVideoEditProviderConfig,
} from "./higgsfieldVideoEditConfig.ts";
import {
  normalizeProviderError,
  type NormalizedProviderError,
  type ProviderAdapter,
  type ProviderJobIdentity,
  type ProviderJobResult,
  type ProviderJobStatus,
  type ProviderSubmitRequest,
} from "./providerAdapter.ts";
import { createHiggsfieldVideoEditApiTransport } from "./higgsfieldVideoEditApiTransport.ts";

export type HiggsfieldVideoEditBridgePayload = {
  capability: "video_edit";
  providerId: "higgsfield";
  projectId: string | null;
  nodeId: string;
  model: string;
  mode: string;
  prompt: string;
  duration: number;
  ratio: string;
  sourceVideo: {
    assetId: string;
    sourceNodeId: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    duration: number;
  };
};

export type HiggsfieldVideoEditTransportResult = {
  clientJobId?: string;
  databaseJobId: string;
  providerJobId: string;
  statusJobId?: string;
  status: ProviderJobStatus;
  videoUrl?: string;
  thumbnail?: string;
  errorCode?: string;
  errorMessage?: string;
  providerStatus?: string;
};

export interface HiggsfieldVideoEditTransport {
  submit(
    payload: HiggsfieldVideoEditBridgePayload,
  ): Promise<HiggsfieldVideoEditTransportResult>;
  status(statusJobId: string): Promise<HiggsfieldVideoEditTransportResult>;
  cancel(statusJobId: string): Promise<HiggsfieldVideoEditTransportResult>;
}

type AdapterOptions = {
  config?: HiggsfieldVideoEditProviderConfig;
  transport?: HiggsfieldVideoEditTransport;
};

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

function extensionFromUrl(value: string) {
  try {
    const path = new URL(value).pathname;
    const suffix = path.match(/\.([a-z0-9]+)$/i)?.[1] || "";
    return suffix ? `.${suffix.toLowerCase()}` : "";
  } catch {
    return "";
  }
}

function disabledError(message: string) {
  return Object.assign(new Error(message), {
    code: "PROVIDER_EXECUTION_DISABLED",
  });
}

function invalidInput(message: string) {
  return Object.assign(new Error(message), {
    code: "PROVIDER_INVALID_INPUT",
    status: 422,
  });
}

function validateAndMapInput(
  request: ProviderSubmitRequest,
  config: HiggsfieldVideoEditProviderConfig,
): HiggsfieldVideoEditBridgePayload {
  if (request.capability !== "video_edit") {
    throw invalidInput("Higgsfield Video Edit only accepts video_edit tasks.");
  }
  const sourceVideo = asRecord(request.payload.sourceVideo);
  const parameters = asRecord(request.payload.parameters);
  const url = stringValue(sourceVideo.url);
  const mimeType = stringValue(
    sourceVideo.mimeType || asRecord(sourceVideo.metadata).mimeType,
  ).toLowerCase();
  const sizeBytes = numberValue(
    sourceVideo.sizeBytes ||
      sourceVideo.fileSizeBytes ||
      asRecord(sourceVideo.metadata).sizeBytes ||
      asRecord(sourceVideo.metadata).fileSizeBytes,
  );
  const sourceDuration = numberValue(
    sourceVideo.duration || asRecord(sourceVideo.metadata).duration,
  );
  const duration = numberValue(request.payload.duration || parameters.duration);
  const ratio = stringValue(request.payload.ratio || parameters.ratio);
  const model = stringValue(request.payload.model || parameters.model);
  const prompt = stringValue(request.payload.prompt);
  const extension = extensionFromUrl(url);

  if (!url || !/^https:\/\//i.test(url)) {
    throw invalidInput("A secure source video URL is required.");
  }
  if (!prompt) throw invalidInput("A Video Edit prompt is required.");
  if (!model || !config.models.some((item) => item.enabled && item.id === model)) {
    throw invalidInput("The selected Higgsfield Video Edit model is unavailable.");
  }
  if (!mimeType || !config.limits.acceptedMimeTypes.includes(mimeType)) {
    throw invalidInput("The source video format is not supported.");
  }
  if (!extension || !config.limits.acceptedExtensions.includes(extension)) {
    throw invalidInput("The source video file extension is not supported.");
  }
  if (!sizeBytes || !config.limits.maxFileBytes || sizeBytes > config.limits.maxFileBytes) {
    throw invalidInput("The source video file size is missing or exceeds the provider limit.");
  }
  if (!sourceDuration || !config.limits.durations.includes(sourceDuration)) {
    throw invalidInput("The source video duration is missing or unsupported.");
  }
  if (!duration || !config.limits.durations.includes(duration)) {
    throw invalidInput("The requested edit duration is unsupported.");
  }
  if (!ratio || !config.limits.ratios.includes(ratio)) {
    throw invalidInput("The requested aspect ratio is unsupported.");
  }

  return {
    capability: "video_edit",
    providerId: "higgsfield",
    projectId: request.projectId,
    nodeId: request.nodeId,
    model,
    mode: request.mode || "video_to_video",
    prompt,
    duration,
    ratio,
    sourceVideo: {
      assetId: stringValue(sourceVideo.assetId),
      sourceNodeId: stringValue(sourceVideo.sourceNodeId),
      url,
      mimeType,
      sizeBytes,
      duration: sourceDuration,
    },
  };
}

function normalizeIdentity(
  result: HiggsfieldVideoEditTransportResult,
  fallback?: ProviderJobIdentity,
): ProviderJobIdentity {
  const databaseJobId =
    stringValue(result.databaseJobId) || fallback?.databaseJobId || "";
  const providerJobId =
    stringValue(result.providerJobId) || fallback?.providerJobId || "";
  const clientJobId =
    stringValue(result.clientJobId) || fallback?.clientJobId || databaseJobId;
  const statusJobId =
    stringValue(result.statusJobId) || fallback?.statusJobId || databaseJobId;
  if (!databaseJobId || !providerJobId || !statusJobId) {
    throw Object.assign(
      new Error("Higgsfield Video Edit response did not include complete Job Identity."),
      { code: "PROVIDER_JOB_FAILED" },
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

function toProviderResult(
  result: HiggsfieldVideoEditTransportResult,
  fallbackIdentity?: ProviderJobIdentity,
): ProviderJobResult {
  const identity = normalizeIdentity(result, fallbackIdentity);
  return {
    identity,
    status: result.status,
    ...(result.videoUrl
      ? {
          output: {
            type: "video",
            videoUrl: result.videoUrl,
            url: result.videoUrl,
            thumbnail: result.thumbnail || result.videoUrl,
          },
        }
      : {}),
    ...(result.errorCode
      ? { errorCode: normalizeHiggsfieldVideoEditError(result).code }
      : {}),
    ...(result.errorMessage ? { message: result.errorMessage } : {}),
    mock: false,
    providerCalled: true,
  };
}

export function normalizeHiggsfieldVideoEditError(
  error: unknown,
): NormalizedProviderError {
  const candidate = asRecord(error);
  return normalizeProviderError({
    status: candidate.status || candidate.statusCode,
    code: candidate.errorCode || candidate.code,
    message:
      candidate.errorMessage ||
      candidate.message ||
      (error instanceof Error ? error.message : ""),
  });
}

export function createHiggsfieldVideoEditAdapter({
  config = HIGGSFIELD_VIDEO_EDIT_CONFIG,
  transport,
}: AdapterOptions = {}): ProviderAdapter {
  const requireTransport = () => {
    if (!transport) {
      throw disabledError(
        "The authenticated ShadowEdge Higgsfield Video Edit bridge is not configured.",
      );
    }
    return transport;
  };

  return {
    key: "higgsfield_video_edit",
    providerId: "higgsfield",
    kind: "real",
    capabilities: ["video_edit"],
    normalizeError: normalizeHiggsfieldVideoEditError,
    async submit(request) {
      if (!isHiggsfieldVideoEditConfigReady(config)) {
        throw disabledError(
          "Higgsfield Video Edit is disabled until credentials, limits, and cost rules are approved.",
        );
      }
      const payload = validateAndMapInput(request, config);
      return toProviderResult(await requireTransport().submit(payload));
    },
    async status(identity) {
      if (!isHiggsfieldVideoEditConfigReady(config)) {
        throw disabledError("Higgsfield Video Edit status polling is disabled.");
      }
      return toProviderResult(
        await requireTransport().status(identity.statusJobId),
        identity,
      );
    },
    async cancel(identity) {
      if (!isHiggsfieldVideoEditConfigReady(config)) {
        throw disabledError("Higgsfield Video Edit cancellation is disabled.");
      }
      return toProviderResult(
        await requireTransport().cancel(identity.statusJobId),
        identity,
      );
    },
  };
}

export const higgsfieldVideoEditAdapter = createHiggsfieldVideoEditAdapter({
  transport: createHiggsfieldVideoEditApiTransport(
    HIGGSFIELD_VIDEO_EDIT_CONFIG,
  ),
});

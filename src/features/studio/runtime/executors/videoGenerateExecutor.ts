import {
  STUDIO_HIGGSFIELD_VIDEO_GENERATION_ENABLED,
  STUDIO_VIDEO_EXECUTION_ENABLED,
} from "@/config/studioFeatures";
import {
  estimateStudioVideoModelCredits,
  normalizeStudioVideoModelParams,
  resolveStudioVideoProviderCostRule,
  resolveStudioVideoGenerationModel,
  resolveStudioVideoGenerationProvider,
  StudioVideoModelResolutionError,
  validateStudioVideoModelReferences,
} from "@/features/studio/capabilities/studioVideoModelResolver";
import type {
  NodeExecutionContext,
  NodeExecutionResult,
  StudioNodeExecutor,
} from "@/features/studio/runtime/types";
import {
  createVideoTask,
  getVideoStatus,
} from "@/lib/video-api";
import { loadStudioProviderModelInventory } from "@/lib/studio-provider-models-api";
import { getVideoErrorReasonCode } from "@/lib/video/videoErrorDisplay";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import {
  getVideoStatusWithVisibilityGrace,
  normalizeVideoJobIdentity,
  type VideoJobIdentity,
} from "@/lib/video/videoJobIdentity";
import {
  getSafeHistoryOutputUrl,
  normalizeVideoPollingStatus,
} from "@/lib/video/historyUtils";
import { VIDEO_PROMPT_FRONTEND_LIMIT } from "@/lib/video/videoPromptLimits";
import {
  isVideoActiveStatus,
  isVideoCompletedStatus,
  isVideoFailedStatus,
} from "@/lib/utils";
import { ApiError } from "@/types/api";
import type {
  UploadMediaItem,
  UploadMediaType,
  VideoModel,
  VideoStatusResponse,
} from "@/types/video";

const POLLING_INTERVAL_MS = 6_000;
const MAX_POLL_ATTEMPTS = 480;
const JOB_VISIBILITY_GRACE_ATTEMPTS = 3;
const JOB_VISIBILITY_RETRY_MS = 2_000;

type StudioVideoErrorCode =
  | "STUDIO_VIDEO_EXECUTION_DISABLED"
  | "STUDIO_HIGGSFIELD_VIDEO_GENERATION_DISABLED"
  | "STUDIO_PROVIDER_MODEL_INVENTORY_UNAVAILABLE"
  | "STUDIO_VIDEO_MODEL_UNAVAILABLE"
  | "STUDIO_VIDEO_MODEL_LIMITS_INCOMPLETE"
  | "STUDIO_VIDEO_PROVIDER_UNAVAILABLE"
  | "AUTH_REQUIRED"
  | "INSUFFICIENT_CREDITS"
  | "FORBIDDEN"
  | "MATERIAL_ISSUE"
  | "PARAMETER_ISSUE"
  | "VIDEO_JOB_NOT_FOUND"
  | "PROVIDER_TEMPORARY"
  | "POLICY_OR_COPYRIGHT";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function configString(context: NodeExecutionContext, key: string) {
  return String(context.config[key] || "").trim();
}

function waitForDuration(durationMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function waitForNextPoll() {
  return waitForDuration(POLLING_INTERVAL_MS);
}

function findPromptInput(context: NodeExecutionContext) {
  return Object.values(context.inputs)
    .map(asRecord)
    .find((input) => typeof input.prompt === "string" && input.prompt.trim());
}

function buildPrompt(context: NodeExecutionContext) {
  const input = findPromptInput(context);
  const prompt = String(input?.prompt || "").trim();
  const style = String(input?.style || "").trim();
  const camera = String(input?.camera || "").trim();

  return [
    prompt,
    style ? `Style: ${style}.` : "",
    camera ? `Camera: ${camera}.` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function inferReferenceType(url: string): UploadMediaType {
  const value = url.toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(?:[?#].*)?$/.test(value)) return "video";
  if (/\.(mp3|wav|m4a|aac|ogg)(?:[?#].*)?$/.test(value)) return "audio";
  return "image";
}

function collectReferenceMedia(context: NodeExecutionContext) {
  const collected = new Map<string, UploadMediaType>();

  function add(urlValue: unknown, typeValue?: unknown) {
    const url = String(urlValue || "").trim();
    if (!url) return;
    const type = String(typeValue || "").trim() as UploadMediaType;
    collected.set(
      url,
      type === "image" || type === "video" || type === "audio"
        ? type
        : inferReferenceType(url),
    );
  }

  function visit(value: unknown, depth: number) {
    if (depth > 4 || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, depth + 1));
      return;
    }

    const record = asRecord(value);
    if (!Object.keys(record).length) return;

    if (record.assetType || record.executor === "asset") {
      add(record.url, record.assetType || record.type);
    }
    if (Array.isArray(record.referenceImages)) {
      record.referenceImages.forEach((url) => add(url, "image"));
    }
    if (Array.isArray(record.referenceVideos)) {
      record.referenceVideos.forEach((url) => add(url, "video"));
    }

    Object.values(record).forEach((entry) => visit(entry, depth + 1));
  }

  visit(context.inputs, 0);
  if (Array.isArray(context.config.references)) {
    context.config.references.forEach((url) => add(url));
  }

  return Array.from(collected, ([url, type], index) => ({
    id: `studio-reference-${index + 1}`,
    type,
    name: `Studio ${type} reference ${index + 1}`,
    url,
    previewUrl: url,
    source: "asset-library" as const,
    uploadStatus: "ready" as const,
  } satisfies UploadMediaItem));
}

function mapReasonCode(message: string, errorCode = ""): StudioVideoErrorCode {
  const normalizedCode = errorCode.trim().toUpperCase();
  if (
    normalizedCode === "MATERIAL_ISSUE" ||
    normalizedCode === "PARAMETER_ISSUE" ||
    normalizedCode === "VIDEO_JOB_NOT_FOUND" ||
    normalizedCode === "PROVIDER_TEMPORARY" ||
    normalizedCode === "POLICY_OR_COPYRIGHT"
  ) {
    return normalizedCode;
  }

  const reason = getVideoErrorReasonCode(message, { errorCode });
  if (reason === "material") return "MATERIAL_ISSUE";
  if (reason === "parameter") return "PARAMETER_ISSUE";
  if (reason === "not_found") return "VIDEO_JOB_NOT_FOUND";
  if (reason === "policy") return "POLICY_OR_COPYRIGHT";
  return "PROVIDER_TEMPORARY";
}

function friendlyMessage(code: StudioVideoErrorCode, fallback = "") {
  if (code === "STUDIO_VIDEO_EXECUTION_DISABLED") {
    return "Studio video execution is disabled in this environment.";
  }
  if (code === "STUDIO_HIGGSFIELD_VIDEO_GENERATION_DISABLED") {
    return "Studio Higgsfield video generation is disabled in this environment.";
  }
  if (
    code === "STUDIO_PROVIDER_MODEL_INVENTORY_UNAVAILABLE" ||
    code === "STUDIO_VIDEO_MODEL_UNAVAILABLE" ||
    code === "STUDIO_VIDEO_MODEL_LIMITS_INCOMPLETE" ||
    code === "STUDIO_VIDEO_PROVIDER_UNAVAILABLE"
  ) {
    return fallback || "The selected runtime video model is unavailable.";
  }
  if (code === "AUTH_REQUIRED") {
    return "Your session expired. Sign in again before running this video node.";
  }
  if (code === "INSUFFICIENT_CREDITS") {
    return "There are not enough credits to run this video node.";
  }
  if (code === "FORBIDDEN") {
    return "This account does not have permission to run video generation.";
  }
  if (code === "MATERIAL_ISSUE") {
    return "A reference asset could not be processed. Replace it and try again.";
  }
  if (code === "PARAMETER_ISSUE") {
    return fallback || "Check the prompt, references, and video node settings.";
  }
  if (code === "VIDEO_JOB_NOT_FOUND") {
    return fallback || "The video job could not be reconciled with this account.";
  }
  if (code === "POLICY_OR_COPYRIGHT") {
    return "The request was blocked by a safety or copyright policy.";
  }
  return "The video provider is temporarily unavailable. Try again later.";
}

function failure(
  code: StudioVideoErrorCode,
  message = "",
  outputs: Record<string, unknown> = {},
): NodeExecutionResult {
  const publicMessage = friendlyMessage(code, message);
  return {
    status: "failed",
    outputs: {
      executor: "video_generate",
      status: "failed",
      errorCode: code,
      message: publicMessage,
      ...outputs,
    },
    error: publicMessage,
  };
}

function jobIdentityOutputs(identity: VideoJobIdentity) {
  return {
    jobId: identity.jobId,
    databaseJobId: identity.databaseJobId,
    dbJobId: identity.databaseJobId,
    providerJobId: identity.providerJobId,
    shadowedgeJobId: identity.shadowedgeJobId,
    providerTrackingId: identity.providerTrackingId,
    providerNativeId: identity.providerNativeId,
    statusJobId: identity.statusJobId,
    jobIdentity: identity,
  };
}

function failureFromError(error: unknown, identity: VideoJobIdentity) {
  if (error instanceof StudioVideoModelResolutionError) {
    return failure(
      error.code as StudioVideoErrorCode,
      error.message,
      jobIdentityOutputs(identity),
    );
  }
  if (error instanceof ApiError) {
    if (error.status === 401 || error.kind === "auth") {
      return failure("AUTH_REQUIRED", "", jobIdentityOutputs(identity));
    }
    if (error.status === 402) {
      return failure("INSUFFICIENT_CREDITS", "", jobIdentityOutputs(identity));
    }
    if (error.status === 403) {
      return failure("FORBIDDEN", "", jobIdentityOutputs(identity));
    }
    return failure(mapReasonCode(error.message, error.code || ""), error.message, {
      ...jobIdentityOutputs(identity),
    });
  }

  const message = error instanceof Error ? error.message : "Video generation failed.";
  return failure(mapReasonCode(message), message, jobIdentityOutputs(identity));
}

function failureFromStatus(status: VideoStatusResponse, identity: VideoJobIdentity) {
  const message = String(
    status.providerPublicMessageEn ||
      status.providerPublicMessage ||
      status.public_message ||
      status.error_message ||
      status.errorMessage ||
      status.message ||
      status.error ||
      "Video generation failed.",
  );
  const errorCode = String(
    status.errorCode ||
      status.error_code ||
      status.providerFailureCategory ||
      "",
  );
  return failure(mapReasonCode(message, errorCode), message, {
    ...jobIdentityOutputs(identity),
    refunded: status.refunded,
    refundAmount: status.refund_amount,
    costCredits: status.cost_credits,
    creditsBalance: status.creditsBalance,
  });
}

function getProgressStatus(status: string) {
  return ["created", "queued", "pending", "submitted", "submitting", "starting", "waiting"].includes(
    status,
  )
    ? "queued"
    : "processing";
}

async function pollVideoJob(
  identity: VideoJobIdentity,
  context: NodeExecutionContext,
): Promise<VideoStatusResponse> {
  let jobVisibilityConfirmed = false;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await waitForNextPoll();
    const response = jobVisibilityConfirmed
      ? await getVideoStatus(identity.statusJobId)
      : await getVideoStatusWithVisibilityGrace({
          identity,
          getStatus: getVideoStatus,
          maxAttempts: JOB_VISIBILITY_GRACE_ATTEMPTS,
          onNotVisible(progress) {
            context.reportProgress({
              status: "processing",
              outputs: {
                executor: "video_generate",
                ...jobIdentityOutputs(identity),
                errorCode: progress.code,
                providerStatus: "job_not_visible_yet",
                visibilityAttempt: progress.attempt,
                visibilityMaxAttempts: progress.maxAttempts,
              },
            });
          },
          wait: () => waitForDuration(JOB_VISIBILITY_RETRY_MS),
        });
    jobVisibilityConfirmed = true;
    const status = response.data || {};
    const outputUrl = getSafeHistoryOutputUrl(status);
    const providerStatus = normalizeVideoPollingStatus(status.status, outputUrl);

    context.reportProgress({
      status: getProgressStatus(providerStatus),
      outputs: {
        executor: "video_generate",
        ...jobIdentityOutputs(identity),
        providerStatus,
        videoUrl: outputUrl,
        thumbnail: status.thumbnail || status.thumbnailUrl || outputUrl,
        creditsBalance: status.creditsBalance,
        costCredits: status.cost_credits,
      },
    });

    if (isVideoFailedStatus(providerStatus)) return status;
    if (isVideoCompletedStatus(providerStatus) && outputUrl) return status;
    if (!isVideoActiveStatus(providerStatus)) return status;
  }

  throw new ApiError("Video status polling timed out.", {
    code: "PROVIDER_TEMPORARY",
    kind: "server",
  });
}

export const VideoGenerateExecutor: StudioNodeExecutor = {
  async execute(context) {
    if (!STUDIO_VIDEO_EXECUTION_ENABLED) {
      return failure("STUDIO_VIDEO_EXECUTION_DISABLED");
    }

    const providerId = configString(context, "providerId") || "higgsfield";
    if (
      providerId === "higgsfield" &&
      !STUDIO_HIGGSFIELD_VIDEO_GENERATION_ENABLED
    ) {
      return failure("STUDIO_HIGGSFIELD_VIDEO_GENERATION_DISABLED");
    }
    let provider: ReturnType<typeof resolveStudioVideoGenerationProvider>;
    try {
      provider = resolveStudioVideoGenerationProvider(providerId);
    } catch (error) {
      if (error instanceof StudioVideoModelResolutionError) {
        return failure(error.code as StudioVideoErrorCode, error.message);
      }
      return failure(
        "STUDIO_VIDEO_PROVIDER_UNAVAILABLE",
        "Studio could not resolve the selected video provider.",
      );
    }
    const savedIdentity = asRecord(context.config.jobIdentity);
    let identity = normalizeVideoJobIdentity({
      jobId: context.config.jobId || savedIdentity.jobId,
      databaseJobId:
        context.config.databaseJobId || savedIdentity.databaseJobId,
      dbJobId: context.config.dbJobId || savedIdentity.dbJobId,
      providerJobId:
        context.config.providerJobId || savedIdentity.providerJobId,
      statusJobId: context.config.statusJobId || savedIdentity.statusJobId,
    });
    let modelId =
      configString(context, "modelId") || configString(context, "model");
    const savedStatus = configString(context, "status").toLowerCase();
    const canResume =
      Boolean(identity.statusJobId) &&
      (savedStatus === "queued" || savedStatus === "processing");

    try {
      let submittedCreditsBalance: number | undefined;
      let submittedCost: number | undefined;

      if (!canResume) {
        const promptInput = findPromptInput(context);
        const prompt = buildPrompt(context);
        if (!prompt) {
          return failure(
            "PARAMETER_ISSUE",
            "Connect a Prompt Node with a non-empty prompt.",
          );
        }
        if (prompt.length > VIDEO_PROMPT_FRONTEND_LIMIT) {
          return failure(
            "PARAMETER_ISSUE",
            `The composed prompt exceeds ${VIDEO_PROMPT_FRONTEND_LIMIT} characters.`,
          );
        }

        const inventory = await loadStudioProviderModelInventory(
          provider.providerId,
          "video_generate",
        );
        const inventoryModel = resolveStudioVideoGenerationModel(inventory, {
          providerId: provider.providerId,
          modelId,
        });
        modelId = inventoryModel.id;
        const params = normalizeStudioVideoModelParams(inventoryModel, {
          duration:
            Number(context.config.duration) ||
            Number(promptInput?.duration),
          ratio:
            configString(context, "ratio") ||
            String(promptInput?.ratio || ""),
          quality:
            configString(context, "quality") ||
            configString(context, "resolution"),
          resolution:
            configString(context, "resolution") ||
            configString(context, "quality"),
          mode: configString(context, "mode"),
          audio:
            typeof context.config.generateAudio === "boolean"
              ? context.config.generateAudio
              : undefined,
        });
        const media = collectReferenceMedia(context);
        const mediaIssue = validateStudioVideoModelReferences(
          inventoryModel,
          media,
        );
        if (mediaIssue) return failure("PARAMETER_ISSUE", mediaIssue);

        resolveStudioVideoProviderCostRule(inventoryModel, params);
        const estimatedCredits = estimateStudioVideoModelCredits(
          inventoryModel,
          params,
        );
        if (estimatedCredits === null) {
          return failure(
            "PARAMETER_ISSUE",
            "Runtime cost metadata is unavailable for this video model.",
          );
        }
        const model: VideoModel = {
          id: inventoryModel.id,
          label: inventoryModel.label,
          provider: inventoryModel.providerId,
          providerModel: inventoryModel.metadata.providerModel,
          desc: inventoryModel.metadata.description,
          credits: estimatedCredits,
          creditBase: inventoryModel.metadata.creditBase || estimatedCredits,
          durations: inventoryModel.limits.durations,
          durationDefault: inventoryModel.limits.durations[0],
          ratios: inventoryModel.limits.ratios,
          qualities: inventoryModel.limits.resolutions,
          supportsAudio: inventoryModel.metadata.supportsAudio,
          uploadSlots: inventoryModel.limits.uploadSlots,
        };

        const request = buildVideoGenerationRequest({
          prompt,
          model,
          duration: params.duration,
          ratio: params.ratio,
          quality: params.quality,
          generateAudio: params.audio,
          media,
          estimatedCredits,
          meta: {
            source: "studio_canvas",
            studioProjectId: context.projectId,
            studioNodeId: context.nodeId,
            studioProviderId: provider.providerId,
            studioModelId: inventoryModel.id,
          },
        });
        const submitted = await createVideoTask(request);
        const result = submitted.data;
        identity = normalizeVideoJobIdentity(result);
        if (!result || !identity.statusJobId) {
          return failure(
            "PROVIDER_TEMPORARY",
            "Video generation started without returning a usable job identity.",
          );
        }

        submittedCreditsBalance = result.creditsBalance;
        submittedCost = result.cost;
        context.reportProgress({
          status: "queued",
          outputs: {
            executor: "video_generate",
            ...jobIdentityOutputs(identity),
            providerId: provider.providerId,
            modelId: inventoryModel.id,
            model: model.id,
            duration: params.duration,
            ratio: params.ratio,
            quality: params.quality,
            resolution: params.resolution,
            references: media.map((item) => item.url),
            providerStatus: result.status || "queued",
            creditsBalance: result.creditsBalance,
            costCredits: result.cost,
          },
        });
      } else {
        context.reportProgress({
          status: savedStatus === "queued" ? "queued" : "processing",
          outputs: {
            executor: "video_generate",
            ...jobIdentityOutputs(identity),
            providerId,
            modelId,
            model: modelId,
            providerStatus: savedStatus,
            resumed: true,
          },
        });
      }

      const status = await pollVideoJob(identity, context);
      identity = normalizeVideoJobIdentity({
        ...identity,
        ...status,
      });
      const providerStatus = normalizeVideoPollingStatus(
        status.status,
        getSafeHistoryOutputUrl(status),
      );
      if (isVideoFailedStatus(providerStatus)) {
        return failureFromStatus(status, identity);
      }

      const videoUrl = getSafeHistoryOutputUrl(status);
      if (!isVideoCompletedStatus(providerStatus) || !videoUrl) {
        return failure(
          "PROVIDER_TEMPORARY",
          "Video generation finished without a usable result.",
          jobIdentityOutputs(identity),
        );
      }

      return {
        status: "completed",
        outputs: {
          executor: "video_generate",
          ...jobIdentityOutputs(identity),
          providerId,
          modelId,
          videoUrl,
          thumbnail: status.thumbnail || status.thumbnailUrl || videoUrl,
          outputUrls: status.outputUrls || status.output_urls || [videoUrl],
          status: "completed",
          model: status.model || modelId,
          creditsBalance: status.creditsBalance ?? submittedCreditsBalance,
          costCredits: status.cost_credits ?? submittedCost,
        },
      };
    } catch (error) {
      return failureFromError(error, identity);
    }
  },
};

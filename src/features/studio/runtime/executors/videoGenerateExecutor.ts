import { STUDIO_VIDEO_EXECUTION_ENABLED } from "@/config/studioFeatures";
import type {
  NodeExecutionContext,
  NodeExecutionResult,
  StudioNodeExecutor,
} from "@/features/studio/runtime/types";
import {
  createVideoTask,
  getVideoModels,
  getVideoStatus,
} from "@/lib/video-api";
import { getVideoErrorReasonCode } from "@/lib/video/videoErrorDisplay";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import {
  getSafeHistoryOutputUrl,
  normalizeVideoPollingStatus,
} from "@/lib/video/historyUtils";
import {
  getVideoModelRule,
  hasVideoModelRule,
  normalizeVideoParamsForModel,
} from "@/lib/video/videoModelRules";
import { VIDEO_PROMPT_FRONTEND_LIMIT } from "@/lib/video/videoPromptLimits";
import { validateReferenceSelectionForRule } from "@/lib/video/videoReferenceRules";
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

type StudioVideoErrorCode =
  | "STUDIO_VIDEO_EXECUTION_DISABLED"
  | "AUTH_REQUIRED"
  | "INSUFFICIENT_CREDITS"
  | "FORBIDDEN"
  | "MATERIAL_ISSUE"
  | "PARAMETER_ISSUE"
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

function waitForNextPoll() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, POLLING_INTERVAL_MS);
  });
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

function normalizeModelKey(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[./\s-]+/g, "_")
    .replace(/[^\w]/g, "");
}

function findConfiguredModel(models: VideoModel[], configuredModel: string) {
  const requested = normalizeModelKey(configuredModel);
  return (
    models.find((model) =>
      [model.id, model.providerModel, model.label]
        .map(normalizeModelKey)
        .filter(Boolean)
        .includes(requested),
    ) || models[0]
  );
}

function buildRuleBackedModel(configuredModel: string): VideoModel {
  const rule = getVideoModelRule(configuredModel || "generic");
  const qualities = (rule.qualities.length ? rule.qualities : rule.resolutions).map(String);
  return {
    id: rule.modelId,
    label: rule.label,
    provider: rule.provider,
    providerModel: rule.modelId,
    credits: Number(rule.credits || rule.creditRules.baseCredits || 12),
    creditBase: Number(rule.creditRules.baseCredits || rule.credits || 12),
    durations: rule.durations,
    durationDefault: rule.defaultDuration,
    ratios: rule.ratios.map(String),
    qualities,
    supportsAudio: true,
    uploadSlots: rule.uploadSlots.map(String),
  };
}

function getModelRuleId(model: VideoModel) {
  const candidates = [model.id, model.providerModel, model.label].filter(
    (value): value is string => Boolean(value),
  );
  return (
    candidates.find((candidate) => hasVideoModelRule(candidate)) ||
    candidates[0] ||
    "generic"
  );
}

function mapReasonCode(message: string, errorCode = ""): StudioVideoErrorCode {
  const normalizedCode = errorCode.trim().toUpperCase();
  if (
    normalizedCode === "MATERIAL_ISSUE" ||
    normalizedCode === "PARAMETER_ISSUE" ||
    normalizedCode === "PROVIDER_TEMPORARY" ||
    normalizedCode === "POLICY_OR_COPYRIGHT"
  ) {
    return normalizedCode;
  }

  const reason = getVideoErrorReasonCode(message, { errorCode });
  if (reason === "material") return "MATERIAL_ISSUE";
  if (reason === "parameter" || reason === "not_found") return "PARAMETER_ISSUE";
  if (reason === "policy") return "POLICY_OR_COPYRIGHT";
  return "PROVIDER_TEMPORARY";
}

function friendlyMessage(code: StudioVideoErrorCode, fallback = "") {
  if (code === "STUDIO_VIDEO_EXECUTION_DISABLED") {
    return "Studio video execution is disabled in this environment.";
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

function failureFromError(error: unknown, jobId = "") {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.kind === "auth") {
      return failure("AUTH_REQUIRED", "", { jobId });
    }
    if (error.status === 402) {
      return failure("INSUFFICIENT_CREDITS", "", { jobId });
    }
    if (error.status === 403) {
      return failure("FORBIDDEN", "", { jobId });
    }
    return failure(mapReasonCode(error.message, error.code || ""), error.message, {
      jobId,
    });
  }

  const message = error instanceof Error ? error.message : "Video generation failed.";
  return failure(mapReasonCode(message), message, { jobId });
}

function failureFromStatus(status: VideoStatusResponse, jobId: string) {
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
    jobId,
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
  jobId: string,
  context: NodeExecutionContext,
): Promise<VideoStatusResponse> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await waitForNextPoll();
    const response = await getVideoStatus(jobId);
    const status = response.data || {};
    const outputUrl = getSafeHistoryOutputUrl(status);
    const providerStatus = normalizeVideoPollingStatus(status.status, outputUrl);

    context.reportProgress({
      status: getProgressStatus(providerStatus),
      outputs: {
        executor: "video_generate",
        jobId,
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

    let jobId = configString(context, "jobId");
    let modelId = configString(context, "model");
    const savedStatus = configString(context, "status").toLowerCase();
    const canResume =
      Boolean(jobId) &&
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

        const models = await getVideoModels().catch(() => []);
        const model =
          findConfiguredModel(models, modelId) || buildRuleBackedModel(modelId);
        modelId = model.id;

        const ruleId = getModelRuleId(model);
        const rule = getVideoModelRule(ruleId);
        const params = normalizeVideoParamsForModel(ruleId, {
          duration:
            Number(context.config.duration) ||
            Number(promptInput?.duration) ||
            model.durationDefault,
          ratio:
            configString(context, "ratio") ||
            String(promptInput?.ratio || "") ||
            model.ratios[0],
          quality:
            configString(context, "quality") ||
            configString(context, "resolution") ||
            model.qualities[0],
          generateAudio: model.supportsAudio !== false,
        });
        const media = collectReferenceMedia(context);
        const mediaIssue = validateReferenceSelectionForRule(rule, [], media);
        if (mediaIssue) return failure("PARAMETER_ISSUE", mediaIssue);

        const request = buildVideoGenerationRequest({
          prompt,
          model,
          duration: params.duration,
          ratio: params.ratio,
          quality: params.quality,
          generateAudio: Boolean(params.generateAudio),
          media,
          meta: {
            source: "studio_canvas",
            studioProjectId: context.projectId,
            studioNodeId: context.nodeId,
          },
        });
        const submitted = await createVideoTask(request);
        const result = submitted.data;
        if (!result?.jobId) {
          return failure(
            "PROVIDER_TEMPORARY",
            "Video generation started without returning a job ID.",
          );
        }

        jobId = result.jobId;
        submittedCreditsBalance = result.creditsBalance;
        submittedCost = result.cost;
        context.reportProgress({
          status: "queued",
          outputs: {
            executor: "video_generate",
            jobId,
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
            jobId,
            model: modelId,
            providerStatus: savedStatus,
            resumed: true,
          },
        });
      }

      const status = await pollVideoJob(jobId, context);
      const providerStatus = normalizeVideoPollingStatus(
        status.status,
        getSafeHistoryOutputUrl(status),
      );
      if (isVideoFailedStatus(providerStatus)) {
        return failureFromStatus(status, jobId);
      }

      const videoUrl = getSafeHistoryOutputUrl(status);
      if (!isVideoCompletedStatus(providerStatus) || !videoUrl) {
        return failure(
          "PROVIDER_TEMPORARY",
          "Video generation finished without a usable result.",
          { jobId },
        );
      }

      return {
        status: "completed",
        outputs: {
          executor: "video_generate",
          jobId,
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
      return failureFromError(error, jobId);
    }
  },
};

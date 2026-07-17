import { STUDIO_IMAGE_EXECUTION_ENABLED } from "@/config/studioFeatures";
import type {
  NodeExecutionContext,
  NodeExecutionResult,
  StudioNodeExecutor,
} from "@/features/studio/runtime/types";
import {
  buildImageGenerateRequest,
  generateImage,
  getImageModels,
  getImageStatus,
} from "@/lib/image-api";
import { getImageErrorReasonCode } from "@/lib/image/imageErrorDisplay";
import {
  isImageActiveStatus,
  isImageCompletedStatus,
  isImageFailedStatus,
} from "@/lib/image/imageHistoryUtils";
import {
  getImageModelById,
  normalizeImageGenerationParams,
} from "@/lib/image/imageModelRules";
import { IMAGE_PROMPT_FRONTEND_LIMIT } from "@/lib/image/imagePromptLimits";
import { ApiError } from "@/types/api";
import type { ImageJobStatus } from "@/types/image";

const POLLING_INTERVAL_MS = 4_000;
const MAX_POLL_ATTEMPTS = 150;

type StudioImageErrorCode =
  | "STUDIO_IMAGE_EXECUTION_DISABLED"
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

function collectReferenceImages(context: NodeExecutionContext) {
  const urls = new Set<string>();

  function visit(value: unknown, depth: number) {
    if (depth > 4 || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, depth + 1));
      return;
    }

    const record = asRecord(value);
    if (!Object.keys(record).length) return;

    const isImageAsset =
      record.assetType === "image" ||
      (record.executor === "asset" && record.type === "image");
    const assetUrl = String(record.url || "").trim();
    if (isImageAsset && assetUrl) urls.add(assetUrl);

    const references = record.referenceImages;
    if (Array.isArray(references)) {
      references.map(String).map((url) => url.trim()).filter(Boolean).forEach((url) => urls.add(url));
    }

    Object.values(record).forEach((entry) => visit(entry, depth + 1));
  }

  visit(context.inputs, 0);
  return Array.from(urls);
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

function mapReasonCode(message: string, errorCode = ""): StudioImageErrorCode {
  const normalizedCode = errorCode.trim().toUpperCase();
  if (
    normalizedCode === "MATERIAL_ISSUE" ||
    normalizedCode === "PARAMETER_ISSUE" ||
    normalizedCode === "PROVIDER_TEMPORARY" ||
    normalizedCode === "POLICY_OR_COPYRIGHT"
  ) {
    return normalizedCode;
  }

  const reason = getImageErrorReasonCode(message, { errorCode });
  if (reason === "material") return "MATERIAL_ISSUE";
  if (reason === "parameter") return "PARAMETER_ISSUE";
  if (reason === "policy") return "POLICY_OR_COPYRIGHT";
  return "PROVIDER_TEMPORARY";
}

function friendlyMessage(code: StudioImageErrorCode, fallback = "") {
  if (code === "STUDIO_IMAGE_EXECUTION_DISABLED") {
    return "Studio image execution is disabled in this environment.";
  }
  if (code === "AUTH_REQUIRED") {
    return "Your session expired. Sign in again before running this image node.";
  }
  if (code === "INSUFFICIENT_CREDITS") {
    return "There are not enough credits to run this image node.";
  }
  if (code === "FORBIDDEN") {
    return "This account does not have permission to run image generation.";
  }
  if (code === "MATERIAL_ISSUE") {
    return "A reference image could not be processed. Replace it and try again.";
  }
  if (code === "PARAMETER_ISSUE") {
    return fallback || "Check the prompt and image node settings, then try again.";
  }
  if (code === "POLICY_OR_COPYRIGHT") {
    return "The request was blocked by a safety or copyright policy.";
  }
  return "The image provider is temporarily unavailable. Try again later.";
}

function failure(
  code: StudioImageErrorCode,
  message = "",
  outputs: Record<string, unknown> = {},
): NodeExecutionResult {
  const publicMessage = friendlyMessage(code, message);
  return {
    status: "failed",
    outputs: {
      executor: "image_generate",
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
    const code = mapReasonCode(error.message, error.code || "");
    return failure(code, error.message, { jobId });
  }

  const message = error instanceof Error ? error.message : "Image generation failed.";
  return failure(mapReasonCode(message), message, { jobId });
}

function failureFromStatus(status: ImageJobStatus) {
  const message =
    status.errorPublicMessageEn ||
    status.errorPublicMessageZh ||
    status.errorMessage ||
    "Image generation failed.";
  const code = mapReasonCode(
    status.errorClassificationMessage || message,
    status.errorCode,
  );
  return failure(code, message, {
    jobId: status.dbJobId || status.jobId || status.id,
    creditsCharged: status.creditsCharged,
    refunded: status.refunded,
  });
}

async function pollImageJob(
  jobId: string,
  context: NodeExecutionContext,
): Promise<ImageJobStatus> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    await waitForNextPoll();
    const status = await getImageStatus(jobId);
    context.reportProgress({
      status: "processing",
      outputs: {
        executor: "image_generate",
        jobId,
        providerStatus: status.status,
      },
    });

    if (isImageCompletedStatus(status.status) || isImageFailedStatus(status.status)) {
      return status;
    }
    if (!isImageActiveStatus(status.status)) {
      return status;
    }
  }

  throw new ApiError("Image status polling timed out.", {
    code: "PROVIDER_TEMPORARY",
    kind: "server",
  });
}

export const ImageGenerateExecutor: StudioNodeExecutor = {
  async execute(context) {
    if (!STUDIO_IMAGE_EXECUTION_ENABLED) {
      return failure("STUDIO_IMAGE_EXECUTION_DISABLED");
    }

    const promptInput = findPromptInput(context);
    const prompt = buildPrompt(context);
    if (!prompt) {
      return failure("PARAMETER_ISSUE", "Connect a Prompt Node with a non-empty prompt.");
    }
    if (prompt.length > IMAGE_PROMPT_FRONTEND_LIMIT) {
      return failure(
        "PARAMETER_ISSUE",
        `The composed prompt exceeds ${IMAGE_PROMPT_FRONTEND_LIMIT} characters.`,
      );
    }

    let jobId = "";
    try {
      const models = await getImageModels();
      const model = getImageModelById(models, configString(context, "model"));
      const configuredRatio = configString(context, "ratio");
      const params = normalizeImageGenerationParams(model, {
        ratio:
          configuredRatio && configuredRatio !== "auto"
            ? configuredRatio
            : String(promptInput?.ratio || configuredRatio),
        resolution: configString(context, "size"),
        quality: configString(context, "quality"),
        batchCount: Number(context.config.count || 1),
      });
      const references = collectReferenceImages(context).slice(
        0,
        Math.max(0, model.capabilities.maxReferences || 0),
      );
      const request = buildImageGenerateRequest({
        prompt,
        model,
        params,
        referenceImages: references,
        meta: {
          source: "studio_canvas",
          studioProjectId: context.projectId,
          studioNodeId: context.nodeId,
        },
      });
      const submitted = await generateImage(request);
      jobId = submitted.dbJobId || submitted.jobId;

      context.reportProgress({
        status: "processing",
        outputs: {
          executor: "image_generate",
          jobId,
          model: model.id,
          providerStatus: submitted.status,
        },
      });

      const status = await pollImageJob(jobId, context);
      if (isImageFailedStatus(status.status)) return failureFromStatus(status);

      const imageUrl = status.outputUrls[0] || status.outputUrl;
      if (!isImageCompletedStatus(status.status) || !imageUrl) {
        return failure("PROVIDER_TEMPORARY", "Image generation completed without a usable result.", {
          jobId,
        });
      }

      return {
        status: "completed",
        outputs: {
          executor: "image_generate",
          jobId,
          imageUrl,
          thumbnail: imageUrl,
          outputUrls: status.outputUrls,
          status: "completed",
          model: model.id,
          ratio: status.ratio || params.ratio,
          quality: status.quality || params.quality,
          size: status.resolution || params.resolution,
          count: status.batchCount || params.batchCount,
          creditsCharged: status.creditsCharged,
        },
      };
    } catch (error) {
      return failureFromError(error, jobId);
    }
  },
};

export type StudioProviderVideoModel = {
  id: string;
  providerId: string;
  capability: "video_generate";
  label: string;
  enabled: boolean;
  metadata: {
    providerModel: string;
    description: string;
    defaultMode: string;
    modes: string[];
    credits: number | null;
    creditBase: number | null;
    creditTable: Record<string, Record<string, number>>;
    supportsAudio: boolean;
    hot: boolean;
  };
  limits: {
    durations: number[];
    ratios: string[];
    resolutions: string[];
    uploadSlots: string[];
    acceptedMediaTypes: string[];
  };
};

export type StudioProviderModelInventory = {
  providerId: string;
  capability: "video_generate";
  models: StudioProviderVideoModel[];
  metadata: {
    source: string;
    dynamic: boolean;
    fetchedAt: string;
    modelCount: number;
  };
  limits: {
    source: string;
    perModel: boolean;
  };
  enabled: boolean;
};

export type StudioVideoModelParams = {
  duration: number;
  ratio: string;
  quality: string;
  resolution: string;
};

export class StudioVideoModelResolutionError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "StudioVideoModelResolutionError";
    this.code = code;
  }
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeKey(value: unknown) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[./\s-]+/g, "_")
    .replace(/[^\w]/g, "");
}

function includesString(values: string[], value: string) {
  return values.some((item) => item === value);
}

export function resolveStudioVideoGenerationModel(
  inventory: StudioProviderModelInventory,
  input: { providerId?: string; modelId?: string },
) {
  const providerId = cleanString(input.providerId) || "higgsfield";
  if (
    inventory.providerId !== providerId ||
    inventory.capability !== "video_generate" ||
    !inventory.enabled
  ) {
    throw new StudioVideoModelResolutionError(
      "STUDIO_PROVIDER_MODEL_INVENTORY_UNAVAILABLE",
      `No enabled runtime video model inventory exists for ${providerId}.`,
    );
  }

  const enabledModels = inventory.models.filter(
    (model) => model.enabled && model.providerId === providerId,
  );
  const requested = normalizeKey(input.modelId);
  const model = requested
    ? enabledModels.find((candidate) =>
        [candidate.id, candidate.metadata.providerModel, candidate.label]
          .map(normalizeKey)
          .includes(requested),
      )
    : enabledModels[0];

  if (!model) {
    throw new StudioVideoModelResolutionError(
      "STUDIO_VIDEO_MODEL_UNAVAILABLE",
      input.modelId
        ? `Runtime model ${input.modelId} is not available for ${providerId}.`
        : `No runtime video model is available for ${providerId}.`,
    );
  }
  return model;
}

export function normalizeStudioVideoModelParams(
  model: StudioProviderVideoModel,
  input: Partial<StudioVideoModelParams>,
): StudioVideoModelParams {
  const durations = model.limits.durations;
  const ratios = model.limits.ratios;
  const resolutions = model.limits.resolutions;
  const requestedDuration = Number(input.duration);
  const requestedRatio = cleanString(input.ratio);
  const requestedResolution = cleanString(input.resolution || input.quality);
  const duration = durations.includes(requestedDuration)
    ? requestedDuration
    : durations[0];
  const ratio = includesString(ratios, requestedRatio)
    ? requestedRatio
    : ratios[0];
  const resolution = includesString(resolutions, requestedResolution)
    ? requestedResolution
    : resolutions[0];

  if (!duration || !ratio || !resolution) {
    throw new StudioVideoModelResolutionError(
      "STUDIO_VIDEO_MODEL_LIMITS_INCOMPLETE",
      `Runtime limits are incomplete for ${model.id}.`,
    );
  }

  return { duration, ratio, quality: resolution, resolution };
}

export function estimateStudioVideoModelCredits(
  model: StudioProviderVideoModel,
  input: Pick<StudioVideoModelParams, "duration" | "quality" | "resolution">,
) {
  const durationRules = model.metadata.creditTable[String(input.duration)] || {};
  const resolution = cleanString(input.resolution || input.quality);
  const tableCredits = Number(durationRules[resolution]);
  if (Number.isFinite(tableCredits) && tableCredits >= 0) return tableCredits;
  const defaultCredits = Number(model.metadata.credits);
  return Number.isFinite(defaultCredits) && defaultCredits >= 0
    ? defaultCredits
    : null;
}

export function validateStudioVideoModelReferences(
  model: StudioProviderVideoModel,
  media: Array<{ type: string }>,
) {
  const accepted = new Set(model.limits.acceptedMediaTypes);
  const unsupported = media.find((item) => !accepted.has(item.type));
  return unsupported
    ? `${model.label} does not accept ${unsupported.type} references in the runtime inventory.`
    : "";
}

export function resolveStudioVideoGenerationProvider(providerId: string) {
  if (providerId !== "higgsfield") {
    throw new StudioVideoModelResolutionError(
      "STUDIO_VIDEO_PROVIDER_UNAVAILABLE",
      `Studio has no existing video executor mapping for ${providerId}.`,
    );
  }
  return {
    providerId: "higgsfield" as const,
    executor: "existing_video_api" as const,
  };
}

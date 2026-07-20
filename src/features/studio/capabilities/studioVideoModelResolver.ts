import type { StudioProviderReadiness } from "./studioProviderReadiness";

export type ProviderCostScope = "EXACT" | "PARTIAL" | "UNKNOWN";
export type StudioModelReadinessStatus =
  | "READY"
  | "LIMITED"
  | "COMING_SOON"
  | "BLOCKED";
export type StudioModelAvailabilityStatus =
  | "AVAILABLE"
  | "BETA"
  | "LIMITED"
  | "COMING_SOON"
  | "BLOCKED";
export type StudioModelCostStatus =
  | "VERIFIED"
  | "QUOTE_ONLY"
  | "PARTIAL"
  | "UNKNOWN";

export type StudioVerifiedVideoParameters = {
  duration: number;
  resolution: string;
  ratio: string;
  audio: boolean;
  mode: string;
  scopeKey: string;
};

export type StudioProviderCostRule = {
  providerId: string;
  modelId: string;
  scope: ProviderCostScope;
  scopeKey: string;
  duration: number;
  resolution: string;
  ratio: string;
  audio: boolean;
  mode: string;
  providerCost: number;
  currency: string;
  verified: boolean;
  source: string;
  verifiedAt?: string | null;
  evidenceId?: string | null;
  confidence?: string | null;
};

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
    providerCost?: {
      ready: boolean;
      source: string;
      verifiedScopes: string[];
      variants?: Array<{
        duration: number;
        resolution: string;
        ratio: string;
        audio: boolean;
        mode: string;
        ready: boolean;
      }>;
      rules: StudioProviderCostRule[];
    } | null;
  };
  limits: {
    durations: number[];
    ratios: string[];
    resolutions: string[];
    uploadSlots: string[];
    acceptedMediaTypes: string[];
  };
  readiness?: {
    status: StudioModelReadinessStatus;
    executable: boolean;
    verifiedScopes: string[];
    verifiedParameters: StudioVerifiedVideoParameters[];
    blockers: string[];
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
  readiness: StudioProviderReadiness;
  enabled: boolean;
};

export type StudioVideoModelMetadata = {
  modelId: string;
  displayName: string;
  availability: StudioModelAvailabilityStatus;
  badge: string;
  description: string;
  verifiedScopes: string[];
  costStatus: StudioModelCostStatus;
  executionAllowed: boolean;
};

export type StudioVideoModelParams = {
  duration: number;
  ratio: string;
  quality: string;
  resolution: string;
  mode: string;
  audio: boolean;
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

type StudioVideoModelReleaseRule = {
  displayName: string;
  availability: StudioModelAvailabilityStatus;
  description: string;
  costStatus: StudioModelCostStatus;
  quoteExecutionApproved?: boolean;
};

// Product availability is deliberately separate from runtime readiness. This
// list is release metadata only: it cannot make a blocked runtime model
// executable or expand a verified parameter scope.
const STUDIO_VIDEO_MODEL_RELEASE_POLICY: Readonly<
  Record<string, StudioVideoModelReleaseRule>
> = Object.freeze({
  kling3_0: Object.freeze({
    displayName: "Kling 3.0",
    availability: "AVAILABLE",
    description: "Production-verified video generation.",
    costStatus: "UNKNOWN",
  }),
  seedance_2_0: Object.freeze({
    displayName: "Seedance 2.0",
    availability: "BETA",
    description: "Beta access within the verified 4s / 480p scope.",
    costStatus: "PARTIAL",
  }),
  kling2_6: Object.freeze({
    displayName: "Kling 2.6",
    availability: "BETA",
    description: "Beta access within the verified 5s / 720p scope.",
    costStatus: "QUOTE_ONLY",
    quoteExecutionApproved: true,
  }),
  wan2_7: Object.freeze({
    displayName: "Wan 2.7",
    availability: "BETA",
    description: "Beta access within the verified 5s / 720p scope.",
    costStatus: "QUOTE_ONLY",
    quoteExecutionApproved: true,
  }),
  wan2_6: Object.freeze({
    displayName: "Wan 2.6",
    availability: "BETA",
    description: "Beta access within the verified 5s / 720p scope.",
    costStatus: "QUOTE_ONLY",
    quoteExecutionApproved: true,
  }),
});

export function isStudioVideoModelExecutable(model: StudioProviderVideoModel) {
  return model.readiness?.executable ?? model.enabled;
}

export function getStudioVideoModelReadinessStatus(
  model: StudioProviderVideoModel,
): StudioModelReadinessStatus {
  if (model.readiness?.status) return model.readiness.status;
  return model.enabled ? "READY" : "BLOCKED";
}

export function getStudioVideoModelVerifiedParameters(
  model: StudioProviderVideoModel,
): StudioVerifiedVideoParameters[] {
  if (model.readiness?.verifiedParameters?.length) {
    return model.readiness.verifiedParameters;
  }
  return (model.metadata.providerCost?.variants || [])
    .filter((variant) => variant.ready)
    .map((variant) => ({
      ...variant,
      scopeKey:
        model.metadata.providerCost?.rules.find(
          (rule) =>
            rule.duration === variant.duration &&
            rule.resolution === variant.resolution &&
            rule.ratio === variant.ratio &&
            rule.audio === variant.audio &&
            rule.mode === variant.mode,
        )?.scopeKey || "",
    }));
}

function getStudioVideoModelReleaseRule(model: StudioProviderVideoModel) {
  return STUDIO_VIDEO_MODEL_RELEASE_POLICY[model.id] || null;
}

function availabilityBadge(status: StudioModelAvailabilityStatus) {
  const badges: Record<StudioModelAvailabilityStatus, string> = {
    AVAILABLE: "Available",
    BETA: "Beta",
    LIMITED: "Limited",
    COMING_SOON: "Coming Soon",
    BLOCKED: "Blocked",
  };
  return badges[status];
}

export function getStudioVideoModelScopeSummary(
  model: StudioProviderVideoModel,
) {
  const verified = getStudioVideoModelVerifiedParameters(model);
  if (!verified.length) return "";
  const durations = uniqueSummary(verified.map((item) => `${item.duration}s`));
  const resolutions = uniqueSummary(verified.map((item) => item.resolution));
  const ratios = uniqueSummary(verified.map((item) => item.ratio));
  const audio = uniqueSummary(
    verified.map((item) => (item.audio ? "audio on" : "audio off")),
  );
  return [durations, resolutions, ratios, audio].filter(Boolean).join(" / ");
}

export function getStudioVideoModelCostPresentation(
  model: StudioProviderVideoModel,
) {
  const status =
    getStudioVideoModelReleaseRule(model)?.costStatus || "UNKNOWN";
  const presentations: Record<
    StudioModelCostStatus,
    { label: string; executionAllowed: boolean }
  > = {
    VERIFIED: { label: "Confirmed", executionAllowed: true },
    PARTIAL: { label: "Partially confirmed", executionAllowed: true },
    QUOTE_ONLY: {
      label: "Estimated",
      executionAllowed:
        getStudioVideoModelReleaseRule(model)?.quoteExecutionApproved === true,
    },
    UNKNOWN: { label: "Cost unavailable", executionAllowed: false },
  };
  return { status, ...presentations[status] };
}

export function getStudioVideoModelMetadata(
  model: StudioProviderVideoModel,
): StudioVideoModelMetadata {
  const readiness = getStudioVideoModelReadinessStatus(model);
  const releaseRule = getStudioVideoModelReleaseRule(model);
  let availability: StudioModelAvailabilityStatus =
    readiness === "READY"
      ? "AVAILABLE"
      : readiness === "LIMITED"
        ? "LIMITED"
        : readiness;

  // A release rule may make an already-executable model user-visible as Beta,
  // but it can never override a blocked or coming-soon runtime contract.
  if (
    releaseRule &&
    (readiness === "READY" || readiness === "LIMITED")
  ) {
    availability = releaseRule.availability;
  }

  const cost = getStudioVideoModelCostPresentation(model);
  const availabilityAllowsExecution = ["AVAILABLE", "BETA", "LIMITED"].includes(
    availability,
  );
  const executionAllowed =
    availabilityAllowsExecution &&
    isStudioVideoModelExecutable(model) &&
    cost.executionAllowed;

  return {
    modelId: model.id,
    displayName: releaseRule?.displayName || model.label,
    availability,
    badge: availabilityBadge(availability),
    description:
      releaseRule?.description || model.metadata.description || model.label,
    verifiedScopes: [...(model.readiness?.verifiedScopes || [])],
    costStatus: cost.status,
    executionAllowed,
  };
}

export function getStudioVideoModelAvailabilityPresentation(
  model: StudioProviderVideoModel,
) {
  const metadata = getStudioVideoModelMetadata(model);
  const cost = getStudioVideoModelCostPresentation(model);
  const scope = getStudioVideoModelScopeSummary(model);
  const reason =
    cost.status === "UNKNOWN"
      ? "Provider cost unavailable; execution is disabled."
      : scope
        ? `Supported: ${scope}`
        : metadata.description;
  const indicators: Record<StudioModelAvailabilityStatus, string> = {
    AVAILABLE: "✓",
    BETA: "β",
    LIMITED: "◐",
    COMING_SOON: "○",
    BLOCKED: "×",
  };
  return {
    status: metadata.availability,
    selectable: metadata.executionAllowed,
    indicator: indicators[metadata.availability],
    label: metadata.badge,
    reason,
    scope,
    costStatus: metadata.costStatus,
    costLabel: cost.label,
  };
}

export function formatStudioVideoModelSelectorLabel(
  model: StudioProviderVideoModel,
) {
  const presentation = getStudioVideoModelAvailabilityPresentation(model);
  return [
    getStudioVideoModelMetadata(model).displayName,
    `${presentation.indicator} ${presentation.label}`,
    presentation.scope,
    presentation.costLabel,
  ]
    .filter(Boolean)
    .join(" — ");
}

export function isStudioVideoModelExecutionAllowed(
  model: StudioProviderVideoModel,
) {
  return getStudioVideoModelMetadata(model).executionAllowed;
}

export function getStudioVideoModelParameterOptions(
  model: StudioProviderVideoModel,
) {
  const verified = getStudioVideoModelVerifiedParameters(model);
  const limited = getStudioVideoModelReadinessStatus(model) === "LIMITED";
  const unique = <T,>(values: T[]) => Array.from(new Set(values));
  return {
    durations: limited ? unique(verified.map((item) => item.duration)) : model.limits.durations,
    ratios: limited ? unique(verified.map((item) => item.ratio)) : model.limits.ratios,
    resolutions: limited
      ? unique(verified.map((item) => item.resolution))
      : model.limits.resolutions,
    modes: limited ? unique(verified.map((item) => item.mode)) : model.metadata.modes,
    audio: limited
      ? unique(verified.map((item) => item.audio))
      : model.metadata.supportsAudio
        ? [false, true]
        : [false],
    acceptedMediaTypes: model.limits.acceptedMediaTypes,
  };
}

function readinessReason(code: string) {
  const messages: Record<string, string> = {
    PROVIDER_COST_SCOPE_INCOMPLETE: "Only verified parameter combinations are available.",
    PROVIDER_COST_NOT_CONFIGURED: "Cost verification pending.",
    STUDIO_MODEL_SHADOW_CREDITS_NOT_CONFIGURED: "Credit configuration pending.",
    LIMITS_NOT_CONFIGURED: "Parameter limits are not verified.",
    MODEL_NOT_VERIFIED: "Model contract verification pending.",
    MODEL_NOT_ENABLED: "Provider rollout pending.",
    PRODUCTION_CATALOG_CONTRACT_INCOMPLETE: "Production contract pending.",
    RUNTIME_MODEL_UNAVAILABLE: "Runtime adapter unavailable.",
  };
  return messages[code] || "Model is not available for execution.";
}

export function getStudioVideoModelReadinessPresentation(
  model: StudioProviderVideoModel,
) {
  const status = getStudioVideoModelReadinessStatus(model);
  const blocker = model.readiness?.blockers?.[0] || "";
  const verified = getStudioVideoModelVerifiedParameters(model);
  const limitedSummary = verified.length
    ? `${uniqueSummary(verified.map((item) => `${item.duration}s`))} / ${uniqueSummary(
        verified.map((item) => item.resolution),
      )} only`
    : "Verified parameters only";
  return {
    status,
    selectable: isStudioVideoModelExecutable(model),
    indicator:
      status === "READY"
        ? "✓"
        : status === "LIMITED"
          ? "◐"
          : status === "COMING_SOON"
            ? "○"
            : "×",
    label:
      status === "READY"
        ? "Ready"
        : status === "LIMITED"
          ? "Limited"
          : status === "COMING_SOON"
            ? "Coming Soon"
            : "Blocked",
    reason: status === "LIMITED" ? limitedSummary : blocker ? readinessReason(blocker) : "",
  };
}

function uniqueSummary(values: string[]) {
  return Array.from(new Set(values)).join(", ");
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
    (model) =>
      isStudioVideoModelExecutionAllowed(model) &&
      model.providerId === providerId,
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
  if (
    model.metadata.providerCost &&
    (typeof input.audio !== "boolean" || !cleanString(input.mode))
  ) {
    throw new StudioVideoModelResolutionError(
      "PROVIDER_COST_NOT_CONFIGURED",
      `Audio and mode must be explicit for parameter-scoped cost model ${model.id}.`,
    );
  }
  const durations = model.limits.durations;
  const ratios = model.limits.ratios;
  const resolutions = model.limits.resolutions;
  const requestedDuration = Number(input.duration);
  const requestedRatio = cleanString(input.ratio);
  const requestedResolution = cleanString(input.resolution || input.quality);
  const requestedMode = cleanString(input.mode) || model.metadata.defaultMode;
  const duration = durations.includes(requestedDuration)
    ? requestedDuration
    : durations[0];
  const ratio = includesString(ratios, requestedRatio)
    ? requestedRatio
    : ratios[0];
  const resolution = includesString(resolutions, requestedResolution)
    ? requestedResolution
    : resolutions[0];
  const mode = includesString(model.metadata.modes, requestedMode)
    ? requestedMode
    : model.metadata.defaultMode || model.metadata.modes[0];
  const audio = input.audio === true;

  if (!duration || !ratio || !resolution || !mode) {
    throw new StudioVideoModelResolutionError(
      "STUDIO_VIDEO_MODEL_LIMITS_INCOMPLETE",
      `Runtime limits are incomplete for ${model.id}.`,
    );
  }

  const normalized = { duration, ratio, quality: resolution, resolution, mode, audio };
  if (getStudioVideoModelReadinessStatus(model) !== "LIMITED") return normalized;

  const verified = getStudioVideoModelVerifiedParameters(model);
  const exact = verified.find(
    (variant) =>
      variant.duration === normalized.duration &&
      variant.ratio === normalized.ratio &&
      variant.resolution === normalized.resolution &&
      variant.mode === normalized.mode &&
      variant.audio === normalized.audio,
  );
  const hasCompleteSelection =
    Number.isFinite(Number(input.duration)) &&
    Boolean(cleanString(input.ratio)) &&
    Boolean(cleanString(input.resolution || input.quality)) &&
    Boolean(cleanString(input.mode)) &&
    typeof input.audio === "boolean";
  if (hasCompleteSelection && !exact) {
    throw new StudioVideoModelResolutionError(
      "PROVIDER_COST_NOT_CONFIGURED",
      `The selected parameter combination is not verified for ${model.id}.`,
    );
  }
  const admitted = exact || verified[0];
  if (!admitted) {
    throw new StudioVideoModelResolutionError(
      "PROVIDER_COST_NOT_CONFIGURED",
      `No verified parameter scope is available for ${model.id}.`,
    );
  }
  return {
    duration: admitted.duration,
    ratio: admitted.ratio,
    quality: admitted.resolution,
    resolution: admitted.resolution,
    mode: admitted.mode,
    audio: admitted.audio,
  };
}

export function normalizeStudioVideoModelParamsForChange(
  model: StudioProviderVideoModel,
  current: Partial<StudioVideoModelParams>,
  patch: Partial<StudioVideoModelParams>,
) {
  if (getStudioVideoModelReadinessStatus(model) !== "LIMITED") {
    return normalizeStudioVideoModelParams(model, { ...current, ...patch });
  }
  const verified = getStudioVideoModelVerifiedParameters(model);
  const changedKeys = Object.keys(patch) as Array<keyof StudioVideoModelParams>;
  const admitted = verified.find((variant) =>
    changedKeys.every((key) => {
      const expected: StudioVideoModelParams = {
        duration: variant.duration,
        ratio: variant.ratio,
        quality: variant.resolution,
        resolution: variant.resolution,
        mode: variant.mode,
        audio: variant.audio,
      };
      return expected[key] === patch[key];
    }),
  );
  if (!admitted) {
    throw new StudioVideoModelResolutionError(
      "PROVIDER_COST_NOT_CONFIGURED",
      `The selected parameter combination is not verified for ${model.id}.`,
    );
  }
  return {
    duration: admitted.duration,
    ratio: admitted.ratio,
    quality: admitted.resolution,
    resolution: admitted.resolution,
    mode: admitted.mode,
    audio: admitted.audio,
  };
}

export function resolveStudioVideoProviderCostRule(
  model: StudioProviderVideoModel,
  input: StudioVideoModelParams,
) {
  const providerCost = model.metadata.providerCost;
  // Existing admitted models without parameter-scoped Provider metadata retain
  // their established execution behavior. Models that publish this contract
  // are fail-closed unless an exact verified rule matches every cost parameter.
  if (!providerCost) return null;

  const rule = providerCost.rules.find(
    (candidate) =>
      candidate.scope === "EXACT" &&
      candidate.verified === true &&
      candidate.providerId === model.providerId &&
      candidate.modelId === model.id &&
      candidate.duration === input.duration &&
      candidate.resolution === input.resolution &&
      candidate.ratio === input.ratio &&
      candidate.audio === input.audio &&
      candidate.mode === input.mode,
  );
  if (!providerCost.ready || !rule) {
    throw new StudioVideoModelResolutionError(
      "PROVIDER_COST_NOT_CONFIGURED",
      `No verified Provider cost exists for ${model.id} with the selected parameters.`,
    );
  }
  return rule;
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

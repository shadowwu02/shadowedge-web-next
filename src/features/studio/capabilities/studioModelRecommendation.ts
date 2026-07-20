import {
  isStudioVideoModelExecutionAllowed,
  normalizeStudioVideoModelParams,
  resolveStudioVideoProviderCostRule,
  type StudioProviderModelInventory,
  type StudioProviderVideoModel,
  type StudioVideoModelParams,
} from "./studioVideoModelResolver.ts";

export type StudioModelRecommendationStatus =
  | "RECOMMENDED"
  | "ALTERNATIVE"
  | "INSUFFICIENT_DATA";
export type StudioModelRecommendationConfidence = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type StudioModelRecommendationCandidate = {
  modelId: string;
  displayName: string;
  status: "RECOMMENDED" | "ALTERNATIVE";
  reason: string;
  confidence: Exclude<StudioModelRecommendationConfidence, "NONE">;
  availability: "AVAILABLE" | "BETA";
  costStatus: "VERIFIED" | "PARTIAL" | "QUOTE_ONLY";
  estimatedCredits: number;
  verifiedScope: string;
  scope: {
    duration: number;
    ratio: string;
    resolution: string;
    audio: boolean;
    mode: string;
    scopeKey: string;
  };
  basedOn: string[];
};

export type StudioModelRecommendation = {
  status: "RECOMMENDED" | "INSUFFICIENT_DATA";
  recommendedModelId: string | null;
  recommended: StudioModelRecommendationCandidate | null;
  alternatives: StudioModelRecommendationCandidate[];
  reason: string;
  confidence: StudioModelRecommendationConfidence;
  basedOn: string[];
  generatedAt: string;
  selectionMode: "USER_CONFIRMATION_REQUIRED";
};

export type StudioModelRecommendationInput = {
  prompt: string;
  duration: number;
  ratio: string;
  qualityGoal: string;
  referenceMedia: Array<{ type: "image" | "video" | "audio" }>;
  userPreference: {
    priority: "balanced" | "quality" | "reliability" | "cost";
    modelId?: string;
  };
};

export class StudioModelRecommendationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "StudioModelRecommendationError";
    this.code = code;
  }
}

export function resolveStudioModelRecommendationCandidate(
  inventory: StudioProviderModelInventory,
  candidate: StudioModelRecommendationCandidate,
): { model: StudioProviderVideoModel; params: StudioVideoModelParams } {
  const model = inventory.models.find((item) => item.id === candidate.modelId);
  if (!model || !isStudioVideoModelExecutionAllowed(model)) {
    throw new StudioModelRecommendationError(
      "RECOMMENDED_MODEL_UNAVAILABLE",
      "The recommended model is no longer available.",
    );
  }
  if (
    model.readiness?.verifiedScopes?.length &&
    !model.readiness.verifiedScopes.includes(candidate.verifiedScope)
  ) {
    throw new StudioModelRecommendationError(
      "RECOMMENDED_SCOPE_UNAVAILABLE",
      "The recommended parameter scope is no longer verified.",
    );
  }
  const params = normalizeStudioVideoModelParams(model, {
    duration: candidate.scope.duration,
    ratio: candidate.scope.ratio,
    quality: candidate.scope.resolution,
    resolution: candidate.scope.resolution,
    mode: candidate.scope.mode,
    audio: candidate.scope.audio,
  });
  resolveStudioVideoProviderCostRule(model, params);
  if (
    params.duration !== candidate.scope.duration ||
    params.ratio !== candidate.scope.ratio ||
    params.resolution !== candidate.scope.resolution ||
    params.mode !== candidate.scope.mode ||
    params.audio !== candidate.scope.audio
  ) {
    throw new StudioModelRecommendationError(
      "RECOMMENDED_SCOPE_MISMATCH",
      "The recommendation no longer matches the runtime parameter contract.",
    );
  }
  return { model, params };
}

export function createStudioModelRecommendationPatch(
  inventory: StudioProviderModelInventory,
  candidate: StudioModelRecommendationCandidate,
) {
  const { model, params } = resolveStudioModelRecommendationCandidate(inventory, candidate);
  return {
    providerId: model.providerId,
    modelId: model.id,
    model: model.id,
    duration: params.duration,
    ratio: params.ratio,
    quality: params.quality,
    resolution: params.resolution,
    mode: params.mode,
    generateAudio: params.audio,
  };
}

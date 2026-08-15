import {
  preflightReverseAnalyzeVideoRemake,
  reverseAnalyzeVideoRemake,
  type VideoRemakeReverseAnalyzeInput,
  type VideoRemakeReverseAnalyzeResponse,
} from "@/lib/video-api";
import { isCanonicalAssetId } from "@/lib/video/canonicalReferenceAssets";
import { ApiError } from "@/types/api";

type PreflightPayload = {
  data?: {
    providerCallMade?: unknown;
    ready?: unknown;
    routeReached?: unknown;
    sourceAssetId?: unknown;
    tenantId?: unknown;
    vlmCalled?: unknown;
  };
};

export type ShortRemakeAdmissionDependencies = {
  analyze?: (input: VideoRemakeReverseAnalyzeInput) => Promise<VideoRemakeReverseAnalyzeResponse>;
  onAdmissionReady?: () => void;
  preflight?: (input: VideoRemakeReverseAnalyzeInput) => Promise<PreflightPayload>;
  shouldContinueAfterAdmission?: () => boolean;
};

export function assertShortRemakeAdmissionReady(
  payload: PreflightPayload,
  sourceAssetId: string | undefined,
) {
  const data = payload?.data;
  const expectedAssetId = String(sourceAssetId || "").trim().toLowerCase();
  const returnedAssetId = String(data?.sourceAssetId || "").trim().toLowerCase();
  const tenantId = String(data?.tenantId || "").trim();

  if (
    data?.ready !== true ||
    data?.routeReached !== true ||
    data?.providerCallMade !== false ||
    data?.vlmCalled !== false ||
    !expectedAssetId ||
    returnedAssetId !== expectedAssetId ||
    !tenantId
  ) {
    throw new ApiError("Short Remake video verification could not be completed.", {
      code: "SHORT_REMAKE_PREFLIGHT_CONTRACT_INVALID",
      kind: "server",
      status: 502,
    });
  }
}

/**
 * The only customer analysis sequence: trusted backend admission must pass
 * before the potentially billable reverse-analysis request is sent.
 */
export async function runShortRemakeAfterAdmission(
  input: VideoRemakeReverseAnalyzeInput,
  dependencies: ShortRemakeAdmissionDependencies = {},
) {
  const preflight = dependencies.preflight || preflightReverseAnalyzeVideoRemake;
  const analyze = dependencies.analyze || reverseAnalyzeVideoRemake;
  if (!isCanonicalAssetId(input.sourceAssetId)) {
    throw new ApiError("A Canonical Video Asset is required for Short Remake.", {
      code: "CANONICAL_ASSET_REQUIRED",
      kind: "unknown",
      status: 400,
    });
  }
  const payload = await preflight(input) as PreflightPayload;

  assertShortRemakeAdmissionReady(payload, input.sourceAssetId);
  if (dependencies.shouldContinueAfterAdmission && !dependencies.shouldContinueAfterAdmission()) {
    throw new ApiError("Short Remake request was superseded before analysis started.", {
      code: "SHORT_REMAKE_ANALYSIS_SUPERSEDED",
      kind: "unknown",
      status: 409,
    });
  }
  dependencies.onAdmissionReady?.();

  return analyze(input);
}

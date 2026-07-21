import type {
  NormalizedProviderError,
  ProviderJobIdentity,
  ProviderJobResult,
  ProviderCostEstimate,
  ProviderCostEstimateRequest,
  ProviderSubmitRequest,
} from "@/features/studio/runtime/providers/providerAdapter";
import type { ProviderResolution } from "@/features/studio/runtime/providers/providerRegistry";

export type ProviderRuntimeResult =
  | { ok: true; result: ProviderJobResult }
  | { ok: false; error: NormalizedProviderError };

export async function submitProviderJob(
  resolution: ProviderResolution,
  request: ProviderSubmitRequest,
): Promise<ProviderRuntimeResult> {
  try {
    return { ok: true, result: await resolution.adapter.submit(request) };
  } catch (error) {
    return { ok: false, error: resolution.adapter.normalizeError(error) };
  }
}

export async function getProviderJobStatus(
  resolution: ProviderResolution,
  identity: ProviderJobIdentity,
): Promise<ProviderRuntimeResult> {
  try {
    return { ok: true, result: await resolution.adapter.status(identity) };
  } catch (error) {
    return { ok: false, error: resolution.adapter.normalizeError(error) };
  }
}

export async function cancelProviderJob(
  resolution: ProviderResolution,
  identity: ProviderJobIdentity,
): Promise<ProviderRuntimeResult> {
  try {
    return { ok: true, result: await resolution.adapter.cancel(identity) };
  } catch (error) {
    return { ok: false, error: resolution.adapter.normalizeError(error) };
  }
}

export async function estimateProviderJobCost(
  resolution: ProviderResolution,
  request: ProviderCostEstimateRequest,
): Promise<ProviderCostEstimate | NormalizedProviderError> {
  try {
    return await resolution.adapter.estimateCost(request);
  } catch (error) {
    return resolution.adapter.normalizeError(error);
  }
}

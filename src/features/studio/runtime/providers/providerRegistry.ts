import { STUDIO_PROVIDER_EXECUTION_ENABLED } from "../../../../config/studioFeatures.ts";
import {
  getStudioCapability,
  type StudioCapabilityId,
} from "../../capabilities/studioCapabilities.ts";
import type {
  NormalizedProviderError,
  ProviderAdapter,
} from "@/features/studio/runtime/providers/providerAdapter";
import { mockProviderAdapter } from "./mockProviderAdapter.ts";
import { higgsfieldVideoEditAdapter } from "./higgsfieldVideoEditAdapter.ts";

export type StudioProviderStatus =
  | "existing"
  | "mock"
  | "available"
  | "metadata_only"
  | "disabled";

export type StudioProviderDefinition = {
  providerId: string;
  name: string;
  capabilities: readonly StudioCapabilityId[];
  adapterKey: string;
  status: StudioProviderStatus;
};

export const STUDIO_PROVIDER_REGISTRY: readonly StudioProviderDefinition[] = [
  {
    providerId: "mock",
    name: "Local Mock Provider",
    capabilities: ["video_edit", "motion_control", "camera_control"],
    adapterKey: "mock_provider",
    status: "mock",
  },
  {
    providerId: "shadowedge_video_api",
    name: "Existing Video Generation API",
    capabilities: ["video_generate"],
    adapterKey: "existing_video_executor",
    status: "existing",
  },
  {
    providerId: "higgsfield",
    name: "Higgsfield",
    capabilities: ["video_edit"],
    adapterKey: "higgsfield_video_edit",
    status: "available",
  },
  {
    providerId: "kling",
    name: "Kling",
    capabilities: ["video_edit", "motion_control", "camera_control"],
    adapterKey: "unavailable",
    status: "metadata_only",
  },
];

const adapters = new Map<string, ProviderAdapter>([
  [mockProviderAdapter.key, mockProviderAdapter],
  [higgsfieldVideoEditAdapter.key, higgsfieldVideoEditAdapter],
]);

function unavailable(message: string): ProviderResolutionFailure {
  return {
    ok: false,
    error: {
      code: "CAPABILITY_PROVIDER_UNAVAILABLE",
      message,
      retryable: false,
    },
  };
}

export type ProviderResolution = {
  ok: true;
  capability: StudioCapabilityId;
  provider: StudioProviderDefinition;
  adapter: ProviderAdapter;
};

export type ProviderResolutionFailure = {
  ok: false;
  error: NormalizedProviderError;
};

export function getStudioProvider(providerId: string) {
  return STUDIO_PROVIDER_REGISTRY.find(
    (provider) => provider.providerId === providerId,
  );
}

export function getProviderAdapter(adapterKey: string) {
  return adapters.get(adapterKey);
}

export function registerProviderAdapter(adapter: ProviderAdapter) {
  adapters.set(adapter.key, adapter);
  return () => adapters.delete(adapter.key);
}

export function resolveProviderForCapability({
  capability: capabilityId,
  providerId,
  mode,
}: {
  capability: StudioCapabilityId;
  providerId?: string;
  mode?: string;
}): ProviderResolution | ProviderResolutionFailure {
  const capability = getStudioCapability(capabilityId);
  if (!capability) {
    return unavailable(`Capability ${capabilityId} is not registered.`);
  }

  const capabilityProvider = providerId
    ? capability.providers.find((item) => item.providerId === providerId)
    : capability.providers.find(
        (item) => item.availability === "mock" || item.availability === "available",
      );
  if (!capabilityProvider) {
    return unavailable(
      `No provider is available for capability ${capabilityId}.`,
    );
  }
  if (
    mode &&
    !(capabilityProvider.supportedModes as readonly string[]).includes(mode)
  ) {
    return unavailable(
      `Provider ${capabilityProvider.providerId} does not support ${capabilityId}:${mode}.`,
    );
  }

  const provider = getStudioProvider(capabilityProvider.providerId);
  if (
    !provider ||
    !provider.capabilities.includes(capabilityId) ||
    provider.status === "metadata_only" ||
    provider.status === "disabled"
  ) {
    return unavailable(
      `Provider ${capabilityProvider.providerId} is metadata-only or unavailable.`,
    );
  }
  if (provider.adapterKey !== capabilityProvider.adapterKey) {
    return unavailable(
      `Provider ${provider.providerId} has no matching adapter for ${capabilityId}.`,
    );
  }

  const adapter = getProviderAdapter(provider.adapterKey);
  if (!adapter || !adapter.capabilities.includes(capabilityId)) {
    return unavailable(
      `Adapter ${provider.adapterKey} is not registered for ${capabilityId}.`,
    );
  }
  if (adapter.kind === "real" && !STUDIO_PROVIDER_EXECUTION_ENABLED) {
    return {
      ok: false,
      error: {
        code: "PROVIDER_EXECUTION_DISABLED",
        message: "Studio provider execution is disabled.",
        retryable: false,
      },
    };
  }

  return { ok: true, capability: capabilityId, provider, adapter };
}

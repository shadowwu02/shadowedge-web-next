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
import { motionControlBridgeAdapter } from "./motionControlProviderAdapter.ts";

export type StudioProviderStatus =
  | "ACTIVE"
  | "MOCK"
  | "METADATA_ONLY"
  | "DISABLED";

export type StudioProviderRuntimeType = "cli" | "http" | "bridge" | "mock";

export type StudioProviderDefinition = {
  providerId: string;
  name: string;
  capabilities: readonly StudioCapabilityId[];
  runtimeType: StudioProviderRuntimeType;
  runtimeAdapters: Readonly<Partial<Record<StudioCapabilityId, string>>>;
  status: StudioProviderStatus;
  createdAt: string;
};

export const STUDIO_PROVIDER_REGISTRY: readonly StudioProviderDefinition[] = [
  {
    providerId: "mock",
    name: "Local Mock Provider",
    capabilities: ["video_edit", "motion_control", "camera_control"],
    runtimeType: "mock",
    runtimeAdapters: {
      video_edit: "mock_provider",
      motion_control: "mock_provider",
      camera_control: "mock_provider",
    },
    status: "MOCK",
    createdAt: "2026-07-15T00:00:00.000Z",
  },
  {
    providerId: "higgsfield",
    name: "Higgsfield",
    capabilities: ["video_generate", "video_edit"],
    runtimeType: "cli",
    runtimeAdapters: {
      video_generate: "higgsfield_video_cli",
      video_edit: "higgsfield_video_edit",
    },
    status: "ACTIVE",
    createdAt: "2026-07-18T00:00:00.000Z",
  },
  {
    providerId: "future",
    name: "Provider-neutral Motion Runtime",
    capabilities: ["motion_control"],
    runtimeType: "bridge",
    runtimeAdapters: { motion_control: "motion_control_bridge" },
    status: "ACTIVE",
    createdAt: "2026-07-19T00:00:00.000Z",
  },
  {
    providerId: "kling",
    name: "Kling",
    capabilities: ["video_edit", "motion_control", "camera_control"],
    runtimeType: "http",
    runtimeAdapters: {},
    status: "METADATA_ONLY",
    createdAt: "2026-07-15T00:00:00.000Z",
  },
];

const adapters = new Map<string, ProviderAdapter>([
  [mockProviderAdapter.key, mockProviderAdapter],
  [higgsfieldVideoEditAdapter.key, higgsfieldVideoEditAdapter],
  [motionControlBridgeAdapter.key, motionControlBridgeAdapter],
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

export type ProviderRuntimeDefinition = {
  ok: true;
  capability: StudioCapabilityId;
  provider: StudioProviderDefinition;
  runtimeAdapter: string;
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

export function resolveProviderRuntimeDefinition({
  capability: capabilityId,
  providerId,
}: {
  capability: StudioCapabilityId;
  providerId: string;
}): ProviderRuntimeDefinition | ProviderResolutionFailure {
  const capability = getStudioCapability(capabilityId);
  const provider = getStudioProvider(providerId);
  if (!capability || !provider || !provider.capabilities.includes(capabilityId)) {
    return unavailable(`Provider ${providerId} does not support ${capabilityId}.`);
  }
  if (provider.status === "METADATA_ONLY" || provider.status === "DISABLED") {
    return unavailable(`Provider ${providerId} is metadata-only or unavailable.`);
  }
  const runtimeAdapter = provider.runtimeAdapters[capabilityId];
  if (!runtimeAdapter) {
    return unavailable(`Provider ${providerId} has no runtime adapter for ${capabilityId}.`);
  }
  return { ok: true, capability: capabilityId, provider, runtimeAdapter };
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

  const runtime = resolveProviderRuntimeDefinition({
    capability: capabilityId,
    providerId: capabilityProvider.providerId,
  });
  if (!runtime.ok) return runtime;
  const { provider, runtimeAdapter } = runtime;
  if (runtimeAdapter !== capabilityProvider.adapterKey) {
    return unavailable(
      `Provider ${provider.providerId} has no matching adapter for ${capabilityId}.`,
    );
  }

  const adapter = getProviderAdapter(runtimeAdapter);
  if (!adapter || !adapter.capabilities.includes(capabilityId)) {
    return unavailable(
      `Adapter ${runtimeAdapter} is not registered for ${capabilityId}.`,
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

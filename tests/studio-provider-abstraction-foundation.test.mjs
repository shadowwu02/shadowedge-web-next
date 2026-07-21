import assert from "node:assert/strict";
import test from "node:test";
import { STUDIO_CAPABILITIES } from "../src/features/studio/capabilities/studioCapabilities.ts";
import {
  resolveProviderRuntimeDefinition,
  STUDIO_PROVIDER_REGISTRY,
} from "../src/features/studio/runtime/providers/providerRegistry.ts";
import { mockProviderAdapter } from "../src/features/studio/runtime/providers/mockProviderAdapter.ts";
import { resolveStudioVideoGenerationProvider } from "../src/features/studio/capabilities/studioVideoModelResolver.ts";

test("Provider Registry separates provider identity from capability adapters", () => {
  const higgsfield = STUDIO_PROVIDER_REGISTRY.find(
    (provider) => provider.providerId === "higgsfield",
  );
  assert.equal(higgsfield?.name, "Higgsfield");
  assert.equal(higgsfield?.runtimeType, "cli");
  assert.equal(
    higgsfield?.runtimeAdapters.video_generate,
    "higgsfield_video_cli",
  );
  assert.equal(
    higgsfield?.runtimeAdapters.video_edit,
    "higgsfield_video_edit",
  );
});

test("Capability Registry includes current and future provider-neutral capabilities", () => {
  assert.deepEqual(
    STUDIO_CAPABILITIES.map((capability) => capability.id),
    [
      "video_generate",
      "video_edit",
      "motion_control",
      "character",
      "camera_control",
    ],
  );
});

test("existing Higgsfield video executor resolves through provider runtime mapping", () => {
  const runtime = resolveProviderRuntimeDefinition({
    capability: "video_generate",
    providerId: "higgsfield",
  });
  assert.equal(runtime.ok, true);
  assert.deepEqual(
    resolveStudioVideoGenerationProvider("higgsfield", "higgsfield_video_cli"),
    {
      providerId: "higgsfield",
      executor: "existing_video_api",
      runtimeAdapter: "higgsfield_video_cli",
    },
  );
});

test("ProviderAdapter exposes provider-neutral cost estimation", async () => {
  const estimate = await mockProviderAdapter.estimateCost({
    capability: "video_edit",
    modelId: "mock-edit",
    parameters: {},
  });
  assert.equal(estimate.amount, 0);
  assert.equal(estimate.currency, "shadowedge_credits");
  assert.equal(estimate.status, "VERIFIED");
});

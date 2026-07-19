import test from "node:test";
import assert from "node:assert/strict";
import {
  estimateStudioVideoModelCredits,
  normalizeStudioVideoModelParams,
  resolveStudioVideoProviderCostRule,
  resolveStudioVideoGenerationModel,
  resolveStudioVideoGenerationProvider,
  validateStudioVideoModelReferences,
} from "../src/features/studio/capabilities/studioVideoModelResolver.ts";

function inventory() {
  return {
    providerId: "higgsfield",
    capability: "video_generate",
    enabled: true,
    metadata: {
      source: "test_runtime_catalog",
      dynamic: true,
      fetchedAt: "2026-07-18T12:00:00.000Z",
      modelCount: 1,
    },
    limits: { source: "backend_model_config", perModel: true },
    readiness: {
      provider: "higgsfield",
      ready: true,
      checks: {
        catalog: true,
        auth: true,
        credential: true,
        transport: true,
        runtime: true,
        workspace: true,
        cost: true,
      },
      blockers: [],
      error: null,
      credential: {
        strategy: "cli_session",
        configured: true,
        environmentVariables: ["HIGGSFIELD_CLI_BIN"],
      },
      checkedAt: "2026-07-18T12:00:00.000Z",
      cached: false,
    },
    models: [
      {
        id: "seedance_2_0",
        providerId: "higgsfield",
        capability: "video_generate",
        label: "Seedance 2.0",
        enabled: true,
        metadata: {
          providerModel: "seedance_2_0",
          description: "Video generation",
          defaultMode: "std",
          modes: ["std", "fast"],
          credits: 12,
          creditBase: 12,
          creditTable: { "4": { "480p": 12, "720p": 18 } },
          supportsAudio: true,
          hot: true,
          providerCost: {
            ready: true,
            source: "provider_quote_and_account_transactions",
            verifiedScopes: ["4s_480p_16_9_audio_false"],
            rules: [
              {
                providerId: "higgsfield",
                modelId: "seedance_2_0",
                scope: "EXACT",
                scopeKey: "4s_480p_16_9_audio_false",
                duration: 4,
                resolution: "480p",
                ratio: "16:9",
                audio: false,
                mode: "std",
                providerCost: 12,
                currency: "higgsfield_credits",
                verified: true,
                source: "provider_quote_and_account_transactions",
              },
            ],
          },
        },
        limits: {
          durations: [4, 5],
          ratios: ["16:9", "9:16"],
          resolutions: ["480p", "720p"],
          uploadSlots: ["media"],
          acceptedMediaTypes: ["image", "video", "audio"],
        },
      },
    ],
  };
}

test("runtime model resolver selects an enabled Higgsfield model and limits", () => {
  const model = resolveStudioVideoGenerationModel(inventory(), {
    providerId: "higgsfield",
    modelId: "seedance_2_0",
  });
  const params = normalizeStudioVideoModelParams(model, {
    duration: 4,
    ratio: "16:9",
    resolution: "480p",
    mode: "std",
    audio: false,
  });
  assert.equal(model.id, "seedance_2_0");
  assert.deepEqual(params, {
    duration: 4,
    ratio: "16:9",
    quality: "480p",
    resolution: "480p",
    mode: "std",
    audio: false,
  });
  assert.equal(resolveStudioVideoProviderCostRule(model, params)?.providerCost, 12);
  assert.equal(estimateStudioVideoModelCredits(model, params), 12);
});

test("Seedance readiness is limited to the exact verified parameter scope", () => {
  const model = resolveStudioVideoGenerationModel(inventory(), {
    providerId: "higgsfield",
    modelId: "seedance_2_0",
  });
  assert.throws(
    () =>
      resolveStudioVideoProviderCostRule(model, {
        duration: 8,
        ratio: "16:9",
        quality: "720p",
        resolution: "720p",
        mode: "std",
        audio: false,
      }),
    (error) => error.code === "PROVIDER_COST_NOT_CONFIGURED",
  );
  assert.throws(
    () =>
      resolveStudioVideoProviderCostRule(model, {
        duration: 4,
        ratio: "16:9",
        quality: "480p",
        resolution: "480p",
        mode: "std",
        audio: true,
      }),
    (error) => error.code === "PROVIDER_COST_NOT_CONFIGURED",
  );
  assert.throws(
    () =>
      normalizeStudioVideoModelParams(model, {
        duration: 4,
        ratio: "16:9",
        resolution: "480p",
        mode: "std",
      }),
    (error) => error.code === "PROVIDER_COST_NOT_CONFIGURED",
  );
});

test("admitted legacy Kling inventory remains ready without a scoped Provider rule", () => {
  const model = {
    ...inventory().models[0],
    id: "kling3_0",
    metadata: {
      ...inventory().models[0].metadata,
      providerModel: "kling3_0",
      providerCost: null,
    },
  };
  assert.equal(
    resolveStudioVideoProviderCostRule(model, {
      duration: 4,
      ratio: "16:9",
      quality: "480p",
      resolution: "480p",
      mode: "std",
      audio: false,
    }),
    null,
  );
});

test("empty or mismatched inventory fails closed without a static model fallback", () => {
  assert.throws(
    () =>
      resolveStudioVideoGenerationModel(
        { ...inventory(), enabled: false, models: [] },
        { providerId: "higgsfield", modelId: "seedance_2_0" },
      ),
    (error) => error.code === "STUDIO_PROVIDER_MODEL_INVENTORY_UNAVAILABLE",
  );
  assert.throws(
    () =>
      resolveStudioVideoGenerationModel(inventory(), {
        providerId: "higgsfield",
        modelId: "frontend_guess",
      }),
    (error) => error.code === "STUDIO_VIDEO_MODEL_UNAVAILABLE",
  );
});

test("plan provider mapping resolves only to the existing Video API executor", () => {
  const provider = resolveStudioVideoGenerationProvider("higgsfield");
  assert.deepEqual(provider, {
    providerId: "higgsfield",
    executor: "existing_video_api",
  });
  assert.throws(
    () => resolveStudioVideoGenerationProvider("unconfigured"),
    (error) => error.code === "STUDIO_VIDEO_PROVIDER_UNAVAILABLE",
  );
});

test("runtime media limits are enforced before execution", () => {
  const model = resolveStudioVideoGenerationModel(inventory(), {
    providerId: "higgsfield",
    modelId: "seedance_2_0",
  });
  assert.equal(
    validateStudioVideoModelReferences(model, [
      { type: "image" },
      { type: "video" },
      { type: "audio" },
    ]),
    "",
  );
  assert.match(
    validateStudioVideoModelReferences(
      { ...model, limits: { ...model.limits, acceptedMediaTypes: ["image"] } },
      [{ type: "video" }],
    ),
    /does not accept video references/,
  );
});

test("Higgsfield Studio execution flag defaults to disabled", async () => {
  const original = process.env.NEXT_PUBLIC_STUDIO_HIGGSFIELD_VIDEO_GENERATION_ENABLED;
  delete process.env.NEXT_PUBLIC_STUDIO_HIGGSFIELD_VIDEO_GENERATION_ENABLED;
  const features = await import(`../src/config/studioFeatures.ts?test=${Date.now()}`);
  assert.equal(features.STUDIO_HIGGSFIELD_VIDEO_GENERATION_ENABLED, false);
  if (original === undefined) {
    delete process.env.NEXT_PUBLIC_STUDIO_HIGGSFIELD_VIDEO_GENERATION_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_STUDIO_HIGGSFIELD_VIDEO_GENERATION_ENABLED = original;
  }
});

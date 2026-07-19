import test from "node:test";
import assert from "node:assert/strict";
import {
  estimateStudioVideoModelCredits,
  getStudioVideoModelParameterOptions,
  getStudioVideoModelReadinessPresentation,
  normalizeStudioVideoModelParams,
  normalizeStudioVideoModelParamsForChange,
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
        readiness: {
          status: "LIMITED",
          executable: true,
          verifiedScopes: ["4s_480p_16_9_audio_false"],
          verifiedParameters: [
            {
              duration: 4,
              resolution: "480p",
              ratio: "16:9",
              audio: false,
              mode: "std",
              scopeKey: "4s_480p_16_9_audio_false",
            },
          ],
          blockers: ["PROVIDER_COST_SCOPE_INCOMPLETE"],
        },
      },
    ],
  };
}

function kling26Inventory({ providerCostReady = false } = {}) {
  const base = inventory();
  return {
    ...base,
    models: [
      {
        ...base.models[0],
        id: "kling2_6",
        label: "Kling 2.6",
        metadata: {
          ...base.models[0].metadata,
          providerModel: "kling2_6",
          defaultMode: "default",
          modes: ["default"],
          credits: 18,
          creditBase: 18,
          creditTable: { "5": { "720p": 18 }, "10": { "720p": 36 } },
          supportsAudio: false,
          providerCost: {
            ready: providerCostReady,
            source: providerCostReady ? "higgsfield_cli_cost_quote" : "unknown",
            verifiedScopes: providerCostReady
              ? ["5s_720p_16_9_audio_false"]
              : [],
            rules: providerCostReady
              ? [
                  {
                    providerId: "higgsfield",
                    modelId: "kling2_6",
                    scope: "EXACT",
                    scopeKey: "5s_720p_16_9_audio_false",
                    duration: 5,
                    resolution: "720p",
                    ratio: "16:9",
                    audio: false,
                    mode: "default",
                    providerCost: 5,
                    currency: "higgsfield_credits",
                    verified: true,
                    source: "higgsfield_cli_cost_quote",
                    evidenceId:
                      "higgsfield-cli-quote-kling2_6-5s-720p-16x9-audio-false-20260719",
                    confidence: "high",
                  },
                ]
              : [],
          },
        },
        limits: {
          durations: [5, 10],
          ratios: ["16:9", "9:16", "1:1"],
          resolutions: ["720p"],
          uploadSlots: ["image"],
          acceptedMediaTypes: ["image"],
        },
        readiness: {
          status: providerCostReady ? "LIMITED" : "COMING_SOON",
          executable: providerCostReady,
          verifiedScopes: providerCostReady
            ? ["5s_720p_16_9_audio_false"]
            : [],
          verifiedParameters: providerCostReady
            ? [
                {
                  duration: 5,
                  resolution: "720p",
                  ratio: "16:9",
                  audio: false,
                  mode: "default",
                  scopeKey: "5s_720p_16_9_audio_false",
                },
              ]
            : [],
          blockers: providerCostReady
            ? ["PROVIDER_COST_SCOPE_INCOMPLETE"]
            : ["PROVIDER_COST_NOT_CONFIGURED"],
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
  assert.deepEqual(getStudioVideoModelParameterOptions(model), {
    durations: [4],
    ratios: ["16:9"],
    resolutions: ["480p"],
    modes: ["std"],
    audio: [false],
    acceptedMediaTypes: ["image", "video", "audio"],
  });
  assert.deepEqual(
    normalizeStudioVideoModelParamsForChange(
      model,
      {
        duration: 4,
        ratio: "16:9",
        resolution: "480p",
        mode: "std",
        audio: false,
      },
      { resolution: "480p" },
    ),
    {
      duration: 4,
      ratio: "16:9",
      quality: "480p",
      resolution: "480p",
      mode: "std",
      audio: false,
    },
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

test("Kling 2.6 remains blocked when Provider cost is unknown", () => {
  assert.throws(
    () =>
      resolveStudioVideoGenerationModel(kling26Inventory(), {
        providerId: "higgsfield",
        modelId: "kling2_6",
      }),
    (error) => error.code === "STUDIO_VIDEO_MODEL_UNAVAILABLE",
  );
});

test("readiness presentation distinguishes Ready, Limited, and Coming Soon", () => {
  const limited = inventory().models[0];
  assert.deepEqual(getStudioVideoModelReadinessPresentation(limited), {
    status: "LIMITED",
    selectable: true,
    indicator: "◐",
    label: "Limited",
    reason: "4s / 480p only",
  });

  const comingSoon = kling26Inventory().models[0];
  assert.equal(getStudioVideoModelReadinessPresentation(comingSoon).selectable, false);
  assert.equal(
    getStudioVideoModelReadinessPresentation(comingSoon).reason,
    "Cost verification pending.",
  );
  assert.throws(
    () =>
      resolveStudioVideoGenerationModel(kling26Inventory(), {
        providerId: "higgsfield",
        modelId: "kling2_6",
      }),
    (error) => error.code === "STUDIO_VIDEO_MODEL_UNAVAILABLE",
  );

  const ready = {
    ...limited,
    id: "kling3_0",
    enabled: true,
    readiness: {
      status: "READY",
      executable: true,
      verifiedScopes: [],
      verifiedParameters: [],
      blockers: [],
    },
  };
  assert.equal(getStudioVideoModelReadinessPresentation(ready).label, "Ready");
  assert.equal(getStudioVideoModelReadinessPresentation(ready).selectable, true);

  const blocked = {
    ...comingSoon,
    readiness: {
      status: "BLOCKED",
      executable: false,
      verifiedScopes: [],
      verifiedParameters: [],
      blockers: ["LIMITS_NOT_CONFIGURED"],
    },
  };
  assert.equal(getStudioVideoModelReadinessPresentation(blocked).label, "Blocked");
  assert.equal(getStudioVideoModelReadinessPresentation(blocked).selectable, false);
  assert.equal(
    getStudioVideoModelReadinessPresentation(blocked).reason,
    "Parameter limits are not verified.",
  );
});

test("the quoted Kling 2.6 scope uses the existing resolver and executor mapping", () => {
  const model = resolveStudioVideoGenerationModel(
    kling26Inventory({ providerCostReady: true }),
    { providerId: "higgsfield", modelId: "kling2_6" },
  );
  const params = normalizeStudioVideoModelParams(model, {
    duration: 5,
    ratio: "16:9",
    resolution: "720p",
    mode: "default",
    audio: false,
  });

  assert.equal(resolveStudioVideoProviderCostRule(model, params)?.providerCost, 5);
  assert.equal(getStudioVideoModelReadinessPresentation(model).reason, "5s / 720p only");
  assert.throws(
    () =>
      normalizeStudioVideoModelParams(model, {
        duration: 10,
        ratio: "16:9",
        resolution: "720p",
        mode: "default",
        audio: false,
      }),
    (error) => error.code === "PROVIDER_COST_NOT_CONFIGURED",
  );
  assert.equal(estimateStudioVideoModelCredits(model, params), 18);
  assert.deepEqual(resolveStudioVideoGenerationProvider("higgsfield"), {
    providerId: "higgsfield",
    executor: "existing_video_api",
  });
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

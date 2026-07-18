import test from "node:test";
import assert from "node:assert/strict";
import {
  estimateStudioVideoModelCredits,
  normalizeStudioVideoModelParams,
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
  });
  assert.equal(model.id, "seedance_2_0");
  assert.deepEqual(params, {
    duration: 4,
    ratio: "16:9",
    quality: "480p",
    resolution: "480p",
  });
  assert.equal(estimateStudioVideoModelCredits(model, params), 12);
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

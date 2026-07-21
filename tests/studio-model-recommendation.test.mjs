import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  createStudioModelRecommendationContext,
  createStudioModelRecommendationPatch,
  resolveStudioModelRecommendationCandidate,
} from "../src/features/studio/capabilities/studioModelRecommendation.ts";

function inventory({ availability = "BETA", executable = true, scope = "5s_720p_16_9_audio_false" } = {}) {
  return {
    providerId: "higgsfield",
    capability: "video_generate",
    enabled: true,
    metadata: { source: "test", dynamic: true, fetchedAt: "2026-07-20T22:00:00.000Z", modelCount: 1 },
    limits: { source: "backend", perModel: true },
    readiness: { ready: true },
    models: [{
      id: "wan2_7",
      label: "Wan 2.7",
      providerId: "higgsfield",
      capability: "video_generate",
      availability,
      enabled: executable,
      metadata: {
        providerModel: "wan2_7",
        description: "Video generation",
        defaultMode: "default",
        modes: ["default"],
        credits: 12,
        creditBase: 12,
        creditTable: { 5: { "720p": 12 } },
        supportsAudio: false,
        hot: false,
        providerCost: {
          ready: true,
          source: "quote",
          verifiedScopes: [scope],
          rules: [{
            providerId: "higgsfield",
            modelId: "wan2_7",
            scope: "EXACT",
            scopeKey: scope,
            duration: 5,
            resolution: "720p",
            ratio: "16:9",
            audio: false,
            mode: "default",
            providerCost: 12,
            currency: "higgsfield_credits",
            verified: true,
            source: "quote",
          }],
        },
      },
      limits: { durations: [5], ratios: ["16:9"], resolutions: ["720p"], uploadSlots: [], acceptedMediaTypes: [] },
      readiness: {
        status: "LIMITED",
        executable,
        verifiedScopes: [scope],
        verifiedParameters: [{ duration: 5, resolution: "720p", ratio: "16:9", audio: false, mode: "default", scopeKey: scope }],
        blockers: [],
      },
    }],
  };
}

function candidate(scope = "5s_720p_16_9_audio_false") {
  return {
    modelId: "wan2_7",
    displayName: "Wan 2.7",
    status: "RECOMMENDED",
    reason: "Verified quality match.",
    confidence: "MEDIUM",
    availability: "BETA",
    costStatus: "QUOTE_ONLY",
    estimatedCredits: 12,
    verifiedScope: scope,
    scope: { duration: 5, resolution: "720p", ratio: "16:9", audio: false, mode: "default", scopeKey: scope },
    preferenceMatch: { score: 82, type: "QUALITY_FIRST", applied: true, reasons: ["Frequently selected model"], sampleSize: 4 },
    basedOn: ["VERIFIED_SCOPE"],
  };
}

test("confirmed recommendation creates a normal existing Video Node parameter patch", () => {
  const patch = createStudioModelRecommendationPatch(inventory(), candidate());
  assert.deepEqual(patch, {
    providerId: "higgsfield",
    modelId: "wan2_7",
    model: "wan2_7",
    duration: 5,
    ratio: "16:9",
    quality: "720p",
    resolution: "720p",
    mode: "default",
    generateAudio: false,
  });
  assert.equal("generationPlanId" in patch, false);
  assert.equal("status" in patch, false);
});

test("blocked model and stale verified scope fail closed on the client", () => {
  assert.throws(
    () => resolveStudioModelRecommendationCandidate(inventory({ availability: "BLOCKED", executable: false }), candidate()),
    (error) => error.code === "RECOMMENDED_MODEL_UNAVAILABLE",
  );
  assert.throws(
    () => resolveStudioModelRecommendationCandidate(inventory(), candidate("8s_720p_16_9_audio_false")),
    (error) => error.code === "RECOMMENDED_SCOPE_UNAVAILABLE",
  );
});

test("Studio UX requires an explicit recommendation request and apply action", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  const inspector = fs.readFileSync("src/features/studio/components/NodeInspector.tsx", "utf8");
  const intentSchema = fs.readFileSync("src/features/studio/capabilities/studioCreativeIntent.ts", "utf8");
  assert.match(component, /What do you want to create\?/);
  assert.match(component, /Find capability and model/);
  assert.match(component, /resolveStudioCapabilityIntent/);
  assert.match(intentSchema, /Video Generation/);
  assert.match(intentSchema, /Character Motion/);
  assert.match(component, /Use \{recommendation\.recommended\.displayName\}/);
  assert.match(component, /Recommendations never change your model until you confirm/);
  assert.match(component, /Personalized/);
  assert.match(component, /generation signals/);
  assert.match(component, /onApply\(createStudioModelRecommendationPatch/);
  assert.doesNotMatch(component, /startGenerationPlan|createGenerationPlan|videoGenerateExecutor|\/api\/video\/generate/i);
  assert.match(inspector, /Advanced model selector/);
  assert.match(inspector, /<select[\s\S]*formatStudioVideoModelSelectorLabel/);
});

test("Capability Intent API is authenticated recommendation-only plumbing", () => {
  const api = fs.readFileSync("src/lib/studio-capability-intent-api.ts", "utf8");
  const schema = fs.readFileSync("src/features/studio/capabilities/studioCreativeIntent.ts", "utf8");
  assert.match(api, /\/api\/capabilities\/resolve-intent/);
  assert.match(api, /method:\s*["']POST["']/);
  assert.match(schema, /CREATE_VIDEO/);
  assert.match(schema, /TRANSFER_MOTION/);
  assert.match(schema, /CAMERA_EFFECT/);
  assert.match(schema, /USER_CONFIRMATION_REQUIRED/);
  assert.doesNotMatch(`${api}${schema}`, /\/api\/video\/generate|createGenerationPlan|startGenerationPlan/i);
});

test("preference profile API remains user-scoped and read-only", () => {
  const api = fs.readFileSync("src/lib/studio-model-recommendation-api.ts", "utf8");
  const profileFunction = api.slice(
    api.indexOf("export async function getMyStudioModelPreferences"),
    api.indexOf("export async function recordStudioModelRecommendationSelection"),
  );
  assert.match(api, /getMyStudioModelPreferences/);
  assert.match(api, /\/api\/me\/model-preferences/);
  assert.doesNotMatch(profileFunction, /method:\s*["']POST["']/);
});

test("recommendation context links explicit choice to the existing generation metadata", () => {
  const recommendation = {
    status: "RECOMMENDED",
    recommendationId: "rec-1",
    recommendedModelId: "wan2_7",
    recommended: candidate(),
    alternatives: [],
    reason: "Verified",
    confidence: "HIGH",
    basedOn: [],
    generatedAt: "2026-07-21T12:00:00.000Z",
    selectionMode: "USER_CONFIRMATION_REQUIRED",
  };
  const context = createStudioModelRecommendationContext(
    recommendation,
    "wan2_7",
    "2026-07-21T12:01:00.000Z",
  );
  const patch = createStudioModelRecommendationPatch(inventory(), candidate(), context);
  assert.equal(patch.modelRecommendation.recommendationId, "rec-1");
  assert.equal(patch.modelRecommendation.accepted, true);
  assert.equal("prompt" in patch.modelRecommendation, false);
});

test("selection tracking is explicit and generation executor forwards only recommendation metadata", () => {
  const api = fs.readFileSync("src/lib/studio-model-recommendation-api.ts", "utf8");
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  const executor = fs.readFileSync("src/features/studio/runtime/executors/videoGenerateExecutor.ts", "utf8");
  assert.match(api, /recordStudioModelRecommendationSelection/);
  assert.match(api, /\/api\/models\/recommend\/events\/\$\{encodeURIComponent\(recommendationId\)\}\/selection/);
  assert.match(component, /onObserved\(context\)/);
  assert.match(component, /recordStudioModelRecommendationSelection/);
  assert.match(executor, /modelRecommendation/);
  assert.doesNotMatch(executor, /recommendation.*prompt|prompt.*recommendation/i);
});

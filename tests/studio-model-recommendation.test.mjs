import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
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
  assert.match(component, /Recommend a model/);
  assert.match(component, /Use \{recommendation\.recommended\.displayName\}/);
  assert.match(component, /Recommendations never change your model until you confirm/);
  assert.match(component, /onApply\(createStudioModelRecommendationPatch/);
  assert.doesNotMatch(component, /startGenerationPlan|createGenerationPlan|videoGenerateExecutor|\/api\/video\/generate/i);
  assert.match(inspector, /<select[\s\S]*formatStudioVideoModelSelectorLabel/);
});

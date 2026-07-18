import assert from "node:assert/strict";
import test from "node:test";
import {
  getCapabilityCostRule,
  getStudioCapability,
  getStudioCapabilityProvider,
  providerSupportsCapabilityMode,
} from "../src/features/studio/capabilities/studioCapabilities.ts";
import { buildMotionControlGenerationPlanItem } from "../src/features/studio/runtime/motionControlPlan.ts";
import { buildCameraControlGenerationPlanItem } from "../src/features/studio/runtime/cameraControlPlan.ts";
import { createMockCameraControlProviderAdapter } from "../src/features/studio/runtime/providers/cameraControlProviderAdapter.ts";
import { bindCompletedVideoResultToTimeline } from "../src/features/studio/lib/studioTimelineBinding.ts";

test("Capability Registry resolves provider-neutral modes and metadata", () => {
  const motion = getStudioCapability("motion_control");
  assert.equal(motion?.category, "control");
  assert.deepEqual(motion?.modes, [
    "character_motion",
    "motion_transfer",
    "camera_motion",
  ]);
  assert.equal(
    getStudioCapabilityProvider("motion_control", "higgsfield")?.availability,
    "metadata_only",
  );
  assert.equal(
    providerSupportsCapabilityMode("camera_control", "mock", "preset"),
    true,
  );
  assert.equal(
    providerSupportsCapabilityMode("camera_control", "kling", "preset"),
    false,
  );
  assert.equal(
    getCapabilityCostRule("camera_control", "mock")?.creditsRule,
    "free_mock",
  );
});

test("Motion capability still creates the existing zero-credit mock Plan item", () => {
  const item = buildMotionControlGenerationPlanItem({
    nodeId: "motion-1",
    mode: "character_motion",
  });
  assert.equal(item.type, "motion_control");
  assert.equal(item.estimatedCredits, 0);
  assert.equal(item.status, "draft");
});

test("Camera Control creates one Queue item and completes through the local adapter", async () => {
  const planItem = buildCameraControlGenerationPlanItem({
    nodeId: "camera-1",
    preset: "dolly",
  });
  assert.deepEqual(planItem, {
    nodeId: "camera-1",
    type: "camera_control",
    status: "draft",
    model: "camera_control:dolly",
    estimatedCredits: 0,
    startedAt: null,
    finishedAt: null,
  });

  const adapter = createMockCameraControlProviderAdapter();
  const input = {
    projectId: "project-1",
    nodeId: "camera-1",
    sourceImage: {
      assetId: "image-1",
      sourceNodeId: "asset-1",
      url: "https://cdn.example.com/image.jpg",
      thumbnail: "https://cdn.example.com/thumb.jpg",
    },
    characterIds: ["character-1"],
    preset: "dolly",
    prompt: "Slow dolly in",
    duration: 4,
    strength: 0.5,
  };
  const submitted = await adapter.submit(input);
  assert.equal(submitted.status, "queued");
  assert.equal(submitted.providerCalled, false);
  const completed = await adapter.status(submitted.identity);
  assert.equal(completed.status, "completed");
  assert.equal(completed.videoUrl, input.sourceImage.url);
  assert.equal(completed.providerCalled, false);

  const bound = bindCompletedVideoResultToTimeline(
    {
      timeline: {
        tracks: [
          { id: "track-video-1", type: "video", clips: [] },
          { id: "track-audio-1", type: "audio", clips: [] },
          { id: "track-subtitle-1", type: "subtitle", clips: [] },
        ],
      },
      sourceNodeId: input.nodeId,
      url: completed.videoUrl,
      thumbnail: completed.thumbnail,
      duration: input.duration,
      characterIds: input.characterIds,
    },
    { createClipId: () => "clip-camera-1" },
  );
  assert.equal(bound.bound, true);
  assert.deepEqual(bound.timeline.tracks[0].clips[0].characterIds, ["character-1"]);
});

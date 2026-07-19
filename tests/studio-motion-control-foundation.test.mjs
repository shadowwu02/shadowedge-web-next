import assert from "node:assert/strict";
import test from "node:test";
import { bindCompletedVideoResultToTimeline } from "../src/features/studio/lib/studioTimelineBinding.ts";
import { buildMotionControlGenerationPlanItem } from "../src/features/studio/runtime/motionControlPlan.ts";
import {
  createMockMotionControlProviderAdapter,
  createMotionControlBridgeAdapter,
} from "../src/features/studio/runtime/providers/motionControlProviderAdapter.ts";
import { getStudioCapabilityProvider } from "../src/features/studio/capabilities/studioCapabilities.ts";

const input = {
  projectId: "project-motion-1",
  nodeId: "motion-control-1",
  sourceImage: {
    assetId: "character-image-1",
    sourceNodeId: "asset-image-1",
    url: "https://cdn.example.com/character.jpg",
    thumbnail: "https://cdn.example.com/character-thumb.jpg",
  },
  motionReferenceVideo: {
    assetId: "motion-video-1",
    sourceNodeId: "asset-video-1",
    url: "https://cdn.example.com/motion.mp4",
    thumbnail: "https://cdn.example.com/motion.jpg",
  },
  mode: "character_motion",
  prompt: "Preserve identity and transfer the action.",
};

test("Image and Motion Video produce one zero-credit Motion Plan item", () => {
  const item = buildMotionControlGenerationPlanItem({
    nodeId: input.nodeId,
    mode: input.mode,
  });
  assert.deepEqual(item, {
    nodeId: input.nodeId,
    type: "motion_control",
    status: "draft",
    model: "motion_control:character_motion",
    estimatedCredits: 0,
    startedAt: null,
    finishedAt: null,
  });
});

test("Queue Motion mock keeps job identity and never calls a provider", async () => {
  const adapter = createMockMotionControlProviderAdapter();
  const submitted = await adapter.submit(input);
  assert.equal(submitted.status, "queued");
  assert.equal(submitted.providerCalled, false);
  assert.ok(submitted.identity.clientJobId);
  assert.ok(submitted.identity.databaseJobId);
  assert.ok(submitted.identity.providerJobId);
  assert.equal(submitted.identity.statusJobId, submitted.identity.databaseJobId);

  const completed = await adapter.status(submitted.identity);
  assert.equal(completed.status, "completed");
  assert.equal(completed.videoUrl, input.motionReferenceVideo.url);
  assert.equal(completed.mock, true);
  assert.equal(completed.providerCalled, false);
});

test("Motion result binds to Timeline through the shared video contract", async () => {
  const adapter = createMockMotionControlProviderAdapter();
  const submitted = await adapter.submit(input);
  const completed = await adapter.status(submitted.identity);
  const timeline = {
    tracks: [
      { id: "track-video-1", type: "video", clips: [] },
      { id: "track-audio-1", type: "audio", clips: [] },
      { id: "track-subtitle-1", type: "subtitle", clips: [] },
    ],
  };
  const bound = bindCompletedVideoResultToTimeline(
    {
      timeline,
      sourceNodeId: input.nodeId,
      url: completed.videoUrl,
      thumbnail: completed.thumbnail,
      duration: 4,
      title: "Motion control",
      model: "motion_control:character_motion",
      createdAt: "2026-07-18T18:00:00.000Z",
    },
    { createClipId: () => "clip-motion-1" },
  );

  assert.equal(bound.bound, true);
  assert.equal(bound.timeline.tracks[0].clips.length, 1);
  assert.equal(bound.timeline.tracks[0].clips[0].sourceNodeId, input.nodeId);
  assert.equal(
    bound.timeline.tracks[0].clips[0].url,
    input.motionReferenceVideo.url,
  );
});

test("Motion capability maps a provider-neutral bridge without choosing a vendor", () => {
  const provider = getStudioCapabilityProvider("motion_control", "future");
  assert.equal(provider?.adapterKey, "motion_control_bridge");
  assert.equal(provider?.availability, "available");
  assert.deepEqual(provider?.supportedModes, [
    "character_motion",
    "motion_transfer",
    "camera_motion",
  ]);
});

test("Motion bridge adapter preserves database/provider/status identities", async () => {
  const transport = {
    async submit(payload) {
      assert.equal(payload.capability, "motion_control");
      assert.equal(payload.providerId, "future");
      return {
        clientJobId: "client-motion-1",
        databaseJobId: "db-motion-1",
        providerJobId: "provider-motion-1",
        statusJobId: "db-motion-1",
        status: "queued",
      };
    },
    async status(statusJobId) {
      assert.equal(statusJobId, "db-motion-1");
      return {
        databaseJobId: "db-motion-1",
        providerJobId: "provider-motion-1",
        statusJobId: "db-motion-1",
        status: "completed",
        videoUrl: input.motionReferenceVideo.url,
      };
    },
    async cancel() {
      throw new Error("not used");
    },
  };
  const adapter = createMotionControlBridgeAdapter({ transport, enabled: true });
  const submitted = await adapter.submit({
    capability: "motion_control",
    projectId: input.projectId,
    nodeId: input.nodeId,
    mode: input.mode,
    payload: {
      providerId: "future",
      modelId: "motion-test-v1",
      duration: 3,
      sourceImage: input.sourceImage,
      motionReferenceVideo: input.motionReferenceVideo,
      prompt: input.prompt,
    },
  });
  assert.equal(submitted.identity.databaseJobId, "db-motion-1");
  assert.equal(submitted.identity.providerJobId, "provider-motion-1");
  assert.equal(submitted.identity.statusJobId, "db-motion-1");

  const completed = await adapter.status(submitted.identity);
  assert.equal(completed.status, "completed");
  assert.equal(completed.output?.videoUrl, input.motionReferenceVideo.url);
});

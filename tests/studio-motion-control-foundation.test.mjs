import assert from "node:assert/strict";
import test from "node:test";
import { bindCompletedVideoResultToTimeline } from "../src/features/studio/lib/studioTimelineBinding.ts";
import { buildMotionControlGenerationPlanItem } from "../src/features/studio/runtime/motionControlPlan.ts";
import { createMockMotionControlProviderAdapter } from "../src/features/studio/runtime/providers/motionControlProviderAdapter.ts";

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

import assert from "node:assert/strict";
import test from "node:test";
import { bindCompletedVideoResultToTimeline } from "../src/features/studio/lib/studioTimelineBinding.ts";
import { createMockVideoEditProviderAdapter } from "../src/features/studio/runtime/providers/videoEditProviderAdapter.ts";
import { buildVideoEditGenerationPlanItem } from "../src/features/studio/runtime/videoEditPlan.ts";

const input = {
  projectId: "project-1",
  nodeId: "video-edit-1",
  sourceVideo: {
    assetId: "asset-video-1",
    sourceNodeId: "asset-node-1",
    url: "https://cdn.example.com/source.mp4",
    thumbnail: "https://cdn.example.com/source.jpg",
  },
  mode: "video_to_video",
  prompt: "Preserve motion and change the look.",
  parameters: {},
};

test("Video Edit Node creates one zero-credit Generation Plan task", () => {
  const item = buildVideoEditGenerationPlanItem({
    nodeId: input.nodeId,
    mode: input.mode,
  });

  assert.deepEqual(item, {
    nodeId: input.nodeId,
    type: "video_edit",
    status: "draft",
    model: "video_edit:video_to_video",
    estimatedCredits: 0,
    startedAt: null,
    finishedAt: null,
  });
});

test("Queue adapter mock completes without a provider call and keeps all job IDs", async () => {
  const adapter = createMockVideoEditProviderAdapter();
  const submitted = await adapter.submit(input);
  assert.equal(submitted.status, "queued");
  assert.equal(submitted.providerCalled, false);
  assert.ok(submitted.identity.clientJobId);
  assert.ok(submitted.identity.databaseJobId);
  assert.ok(submitted.identity.providerJobId);
  assert.equal(submitted.identity.statusJobId, submitted.identity.databaseJobId);

  const completed = await adapter.status(submitted.identity);
  assert.equal(completed.status, "completed");
  assert.equal(completed.videoUrl, input.sourceVideo.url);
  assert.equal(completed.mock, true);
  assert.equal(completed.providerCalled, false);
  assert.deepEqual(completed.identity, submitted.identity);
});

test("mock Video Edit result binds to Timeline through the shared result contract", async () => {
  const adapter = createMockVideoEditProviderAdapter();
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
      title: "AI video edit",
      model: "video_edit:video_to_video",
      createdAt: "2026-07-18T12:00:00.000Z",
    },
    { createClipId: () => "clip-video-edit-1" },
  );

  assert.equal(bound.bound, true);
  assert.equal(bound.timeline.tracks[0].clips.length, 1);
  assert.equal(bound.timeline.tracks[0].clips[0].sourceNodeId, input.nodeId);
  assert.equal(bound.timeline.tracks[0].clips[0].url, input.sourceVideo.url);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  bindCompletedVideoResultToTimeline,
  TIMELINE_BIND_FAILED,
} from "../src/features/studio/lib/studioTimelineBinding.ts";

function emptyTimeline() {
  return {
    tracks: [
      { id: "track-video-1", type: "video", clips: [] },
      { id: "track-audio-1", type: "audio", clips: [] },
      { id: "track-subtitle-1", type: "subtitle", clips: [] },
    ],
  };
}

const completedVideo = {
  sourceNodeId: "video-node-1",
  url: "https://cdn.example.com/result.mp4",
  thumbnail: "https://cdn.example.com/result.jpg",
  duration: 3,
  title: "Generated shot",
  model: "kling3_0",
  createdAt: "2026-07-18T12:00:00.000Z",
};

test("completed video creates one continuous Timeline clip", () => {
  const result = bindCompletedVideoResultToTimeline(
    { timeline: emptyTimeline(), ...completedVideo },
    { createClipId: () => "clip-video-node-1" },
  );

  assert.equal(result.bound, true);
  assert.equal(result.changed, true);
  assert.equal(result.existing, false);
  assert.equal(result.errorCode, "");
  const videoTrack = result.timeline.tracks.find((track) => track.type === "video");
  assert.equal(videoTrack.clips.length, 1);
  assert.deepEqual(videoTrack.clips[0], {
    id: "clip-video-node-1",
    sourceNodeId: "video-node-1",
    sourceType: "video_node",
    url: completedVideo.url,
    thumbnail: completedVideo.thumbnail,
    start: 0,
    duration: 3,
    createdAt: completedVideo.createdAt,
    metadata: {
      title: completedVideo.title,
      model: completedVideo.model,
      status: "completed",
    },
  });
});

test("repeated completion event does not create a duplicate clip", () => {
  const first = bindCompletedVideoResultToTimeline(
    { timeline: emptyTimeline(), ...completedVideo },
    { createClipId: () => "clip-video-node-1" },
  );
  const repeated = bindCompletedVideoResultToTimeline(
    { timeline: first.timeline, ...completedVideo },
    {
      createClipId: () => {
        throw new Error("a second clip id must not be requested");
      },
    },
  );

  assert.equal(repeated.bound, true);
  assert.equal(repeated.existing, true);
  assert.equal(repeated.changed, false);
  const videoTrack = repeated.timeline.tracks.find((track) => track.type === "video");
  assert.equal(videoTrack.clips.length, 1);
  assert.equal(videoTrack.clips[0].sourceNodeId, completedVideo.sourceNodeId);
});

test("binding failure preserves the completed video state", () => {
  const videoNode = { status: "completed", videoUrl: completedVideo.url };
  const timeline = emptyTimeline();
  const result = bindCompletedVideoResultToTimeline(
    { timeline, ...completedVideo },
    {
      createClipId: () => {
        throw new Error("simulated timeline persistence failure");
      },
    },
  );

  assert.equal(result.bound, false);
  assert.equal(result.changed, false);
  assert.equal(result.errorCode, TIMELINE_BIND_FAILED);
  assert.equal(result.timeline, timeline);
  assert.equal(videoNode.status, "completed");
  assert.equal(videoNode.videoUrl, completedVideo.url);
});

test("Remake placeholder is filled in place without changing shot order", () => {
  const timeline = emptyTimeline();
  timeline.tracks[0].clips.push(
    {
      id: "shot-1-placeholder",
      sourceNodeId: "video-node-1",
      sourceType: "video_node",
      url: "",
      thumbnail: "",
      start: 0,
      duration: 3,
      createdAt: "2026-07-18T11:59:00.000Z",
      metadata: { title: "Shot 1", status: "waiting" },
    },
    {
      id: "shot-2-placeholder",
      sourceNodeId: "video-node-2",
      sourceType: "video_node",
      url: "",
      thumbnail: "",
      start: 3,
      duration: 4,
      createdAt: "2026-07-18T11:59:01.000Z",
      metadata: { title: "Shot 2", status: "waiting" },
    },
  );

  const result = bindCompletedVideoResultToTimeline({ timeline, ...completedVideo });
  const videoTrack = result.timeline.tracks.find((track) => track.type === "video");

  assert.equal(result.bound, true);
  assert.equal(result.existing, true);
  assert.deepEqual(
    videoTrack.clips.map((clip) => clip.id),
    ["shot-1-placeholder", "shot-2-placeholder"],
  );
  assert.equal(videoTrack.clips[0].url, completedVideo.url);
  assert.equal(videoTrack.clips[1].url, "");
});

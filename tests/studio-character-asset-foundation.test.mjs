import assert from "node:assert/strict";
import test from "node:test";
import { applyCharacterBindings } from "../src/features/studio/lib/studioCharacterBindings.ts";
import { bindCompletedVideoResultToTimeline } from "../src/features/studio/lib/studioTimelineBinding.ts";

function node(id, kind, characterRefs = undefined) {
  return {
    id,
    data: {
      kind,
      ...(characterRefs ? { characterRefs } : {}),
    },
  };
}

test("Character binds to Video Generate and Motion Control as Canvas metadata", () => {
  const nodes = [
    node("character-1", "character"),
    node("video-1", "videoGenerate", []),
    node("motion-1", "motionControl", []),
  ];
  const result = applyCharacterBindings(nodes, [
    { source: "character-1", target: "video-1" },
    { source: "character-1", target: "motion-1" },
  ]);

  assert.deepEqual(result[1].data.characterRefs, ["character-1"]);
  assert.deepEqual(result[2].data.characterRefs, ["character-1"]);
});

test("Remake Shot carries Character binding into its planned Video node", () => {
  const nodes = [
    node("character-1", "character"),
    node("shot-1", "remakeShot", []),
    node("video-1", "videoGenerate", []),
  ];
  const result = applyCharacterBindings(nodes, [
    { source: "character-1", target: "shot-1" },
    { source: "shot-1", target: "video-1" },
  ]);

  assert.deepEqual(result[1].data.characterRefs, ["character-1"]);
  assert.deepEqual(result[2].data.characterRefs, ["character-1"]);
});

test("removing the Character edge clears the derived binding", () => {
  const nodes = [
    node("character-1", "character"),
    node("video-1", "videoGenerate", ["character-1"]),
  ];
  const result = applyCharacterBindings(nodes, []);
  assert.deepEqual(result[1].data.characterRefs, []);
});

test("completed video stores Character ids on the Timeline clip", () => {
  const result = bindCompletedVideoResultToTimeline(
    {
      timeline: {
        tracks: [
          { id: "track-video-1", type: "video", clips: [] },
          { id: "track-audio-1", type: "audio", clips: [] },
          { id: "track-subtitle-1", type: "subtitle", clips: [] },
        ],
      },
      sourceNodeId: "video-1",
      url: "https://cdn.example.com/video.mp4",
      duration: 4,
      characterIds: ["character-1", "character-1"],
    },
    { createClipId: () => "clip-1" },
  );

  assert.equal(result.bound, true);
  assert.deepEqual(result.timeline.tracks[0].clips[0].characterIds, ["character-1"]);
});

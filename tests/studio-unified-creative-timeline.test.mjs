import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioUnifiedTimeline.ts",
  "utf8",
);
const api = fs.readFileSync("src/lib/studio-unified-timeline-api.ts", "utf8");
const component = fs.readFileSync(
  "src/features/studio/components/StudioUnifiedTimeline.tsx",
  "utf8",
);
const workspace = fs.readFileSync(
  "src/features/studio/components/StudioWorkspace.tsx",
  "utf8",
);

test("Unified Timeline schemas cover Clips, Scenes, and Canvas reference bindings", () => {
  for (const field of [
    "clipId", "projectId", "type", "sourceRef", "start", "duration", "metadata", "createdAt",
    "sceneId", "clips", "agents", "canvasNodeId",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const type of [
    "VIDEO_CLIP", "IMAGE_CLIP", "AUDIO_CLIP", "SUBTITLE_CLIP", "SCENE_MARKER",
  ]) {
    assert.match(schema, new RegExp(`"${type}"`));
  }
});

test("Timeline and Scene APIs are authenticated read-only project queries", () => {
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/timeline/);
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/scenes/);
  assert.doesNotMatch(api, /method:\s*"POST"/);
  assert.doesNotMatch(api, /provider|billing|credits|execute/i);
});

test("Studio renders the unified production layout and Scene structure", () => {
  assert.match(workspace, /<StudioUnifiedTimeline \/>/);
  for (const label of [
    "Unified Timeline",
    "Creative production workspace",
    "Scene structure",
    "Canvas ↔ Timeline",
    "Copilot Timeline Insights",
    "Create Draft Suggestion",
  ]) {
    assert.match(component, new RegExp(label));
  }
  assert.match(component, /studioTimelineClipLabel/);
  assert.match(component, /assetRef/);
  assert.match(component, /agentOrigin/);
});

test("Unified Timeline remains visualization-only", () => {
  assert.match(component, /read-only view/);
  assert.match(component, /no execution controls/);
  assert.doesNotMatch(
    `${component}\n${api}`,
    /createStudioRender|executeStudio|generateVideo|replaceAsset|deductCredits|updateTimeline/,
  );
});

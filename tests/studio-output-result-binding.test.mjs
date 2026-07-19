import assert from "node:assert/strict";
import test from "node:test";
import {
  bindVideoResultToOutputNodes,
  OUTPUT_NODE_CONNECTION_REQUIRED,
} from "../src/features/studio/lib/studioOutputBinding.ts";

function outputNode() {
  return {
    id: "output-1",
    type: "output",
    position: { x: 300, y: 0 },
    data: {
      kind: "output",
      title: "Workflow output",
      sourceNodeId: "",
      resultPreview: "Awaiting an upstream result",
      videoUrl: "",
      outputType: "video",
      createdAt: "",
      completedAt: "",
      status: "idle",
      jobId: "",
      thumbnail: "",
      errorMessage: "",
    },
  };
}

function connectedEdges() {
  return [{ id: "video-output", source: "video-1", target: "output-1" }];
}

const completed = {
  sourceNodeId: "video-1",
  status: "completed",
  videoUrl: "https://cdn.example.com/video.mp4",
  thumbnail: "https://cdn.example.com/video.jpg",
  jobId: "db-video-1",
  completedAt: "2026-07-18T22:00:00.000Z",
};

test("completed Video Node updates the connected Output Node", () => {
  const result = bindVideoResultToOutputNodes({
    nodes: [outputNode()],
    edges: connectedEdges(),
    ...completed,
  });
  const output = result.nodes[0].data;

  assert.equal(result.bound, true);
  assert.equal(result.changed, true);
  assert.equal(result.errorCode, "");
  assert.equal(output.status, "completed");
  assert.equal(output.sourceNodeId, "video-1");
  assert.equal(output.videoUrl, completed.videoUrl);
  assert.equal(output.resultPreview, completed.videoUrl);
  assert.equal(output.thumbnail, completed.thumbnail);
  assert.equal(output.jobId, completed.jobId);
  assert.equal(output.completedAt, completed.completedAt);
});

test("repeated completed event is idempotent", () => {
  const first = bindVideoResultToOutputNodes({
    nodes: [outputNode()],
    edges: connectedEdges(),
    ...completed,
  });
  const repeated = bindVideoResultToOutputNodes({
    nodes: first.nodes,
    edges: connectedEdges(),
    ...completed,
  });

  assert.equal(repeated.bound, true);
  assert.equal(repeated.changed, false);
  assert.equal(repeated.nodes, first.nodes);
});

test("completed Video reuses an idle Output and creates the default edge", () => {
  const nodes = [outputNode()];
  const result = bindVideoResultToOutputNodes({
    nodes,
    edges: [],
    ...completed,
  });

  assert.equal(result.bound, true);
  assert.equal(result.changed, true);
  assert.equal(result.nodes.length, 1);
  assert.equal(result.nodes[0].data.status, "completed");
  assert.equal(result.edges.length, 1);
  assert.equal(result.edges[0].source, "video-1");
  assert.equal(result.edges[0].target, "output-1");
  assert.equal(result.createdOutputNodeId, "");
  assert.equal(result.errorCode, "");
});

test("repeated auto-attach does not create another Output edge", () => {
  const first = bindVideoResultToOutputNodes({
    nodes: [outputNode()],
    edges: [],
    ...completed,
  });
  const repeated = bindVideoResultToOutputNodes({
    nodes: first.nodes,
    edges: first.edges,
    ...completed,
  });

  assert.equal(repeated.bound, true);
  assert.equal(repeated.changed, false);
  assert.equal(repeated.nodes.length, 1);
  assert.equal(repeated.edges.length, 1);
});

test("completed Video creates a default Output when the Canvas has none", () => {
  const source = {
    id: "video-1",
    type: "videoGenerate",
    position: { x: 120, y: 80 },
    data: { kind: "videoGenerate" },
  };
  const result = bindVideoResultToOutputNodes({
    nodes: [source],
    edges: [],
    ...completed,
  });

  assert.equal(result.bound, true);
  assert.equal(result.nodes.length, 2);
  assert.equal(result.edges.length, 1);
  assert.equal(result.createdOutputNodeId, "output-video-1");
  const output = result.nodes.find((node) => node.id === result.createdOutputNodeId);
  assert.equal(output.data.status, "completed");
  assert.equal(output.data.videoUrl, completed.videoUrl);
  assert.deepEqual(output.position, { x: 480, y: 80 });
});

test("failed Video without an Output remains explicit and does not auto-create", () => {
  const result = bindVideoResultToOutputNodes({
    nodes: [],
    edges: [],
    sourceNodeId: "video-1",
    status: "failed",
  });

  assert.equal(result.bound, false);
  assert.equal(result.changed, false);
  assert.equal(result.errorCode, OUTPUT_NODE_CONNECTION_REQUIRED);
});

test("failed Video Node marks the connected Output Node failed", () => {
  const result = bindVideoResultToOutputNodes({
    nodes: [outputNode()],
    edges: connectedEdges(),
    sourceNodeId: "video-1",
    status: "failed",
    jobId: "db-video-1",
    errorMessage: "Provider job failed.",
  });
  const output = result.nodes[0].data;

  assert.equal(result.bound, true);
  assert.equal(result.changed, true);
  assert.equal(output.status, "failed");
  assert.equal(output.sourceNodeId, "video-1");
  assert.equal(output.videoUrl, "");
  assert.equal(output.resultPreview, "");
  assert.equal(output.errorMessage, "Provider job failed.");
});

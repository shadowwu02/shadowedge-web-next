import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Canvas Result Binding schema preserves Timeline, Output, and Asset references", () => {
  const schema = fs.readFileSync("src/features/studio/capabilities/studioAgentCanvas.ts", "utf8");
  for (const field of [
    "bindingId", "canvasNodeId", "executionId", "resultId",
    "timelineRef", "outputRef", "assetRef", "createdAt",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  assert.match(schema, /storage: "REFERENCE_BINDINGS_ONLY"/);
  assert.match(schema, /sourceOfTruth: "TIMELINE_OUTPUT_ASSET"/);
});

test("Canvas results use the authenticated project API", () => {
  const api = fs.readFileSync("src/lib/studio-agent-canvas-api.ts", "utf8");
  assert.match(api, /agent-canvas\/results/);
  assert.match(api, /getStudioCanvasProductionResults/);
  assert.doesNotMatch(api, /method:\s*"POST".*agent-canvas\/results/s);
});

test("Creative Production Layout renders Timeline Preview, Output, and Asset panels", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioAgentCanvas.tsx", "utf8");
  assert.match(component, /aria-label="Creative Production Layout"/);
  assert.match(component, /aria-label="Timeline Preview"/);
  assert.match(component, /aria-label="Output Panel"/);
  assert.match(component, /aria-label="Asset Panel"/);
  for (const label of ["Duration", "Quality", "Version", "Status", "Open output"]) {
    assert.match(component, new RegExp(label));
  }
});

test("Canvas Production UI remains a read-only visualization boundary", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioAgentCanvas.tsx", "utf8");
  const api = fs.readFileSync("src/lib/studio-agent-canvas-api.ts", "utf8");
  const productionSection = component.slice(component.indexOf('aria-label="Creative Production Layout"'));
  assert.match(productionSection, /Read-only references/);
  assert.doesNotMatch(productionSection, />Publish</);
  assert.doesNotMatch(productionSection, />Add to Timeline</);
  assert.doesNotMatch(productionSection, />Execute/);
  assert.doesNotMatch(`${component}\n${api}`, /autoGenerate|publishResult|mutateTimeline|executeStudioWorkflowNode/);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const apiSource = fs.readFileSync(new URL("../src/lib/studio-api-version.ts", import.meta.url), "utf8");
const integrationSource = fs.readFileSync(
  new URL("../src/features/studio/components/StudioApiIntegration.tsx", import.meta.url),
  "utf8",
);
const workspaceSource = fs.readFileSync(
  new URL("../src/features/studio/components/StudioWorkspace.tsx", import.meta.url),
  "utf8",
);
const canvasSource = fs.readFileSync(
  new URL("../src/features/studio/components/StudioCanvas.tsx", import.meta.url),
  "utf8",
);
const sharedApiSource = fs.readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8");

test("Studio API version client validates version, commit, build time, and feature metadata", () => {
  assert.match(apiSource, /version:\s*string/);
  assert.match(apiSource, /commit:\s*string/);
  assert.match(apiSource, /buildTime:\s*string/);
  assert.match(apiSource, /features:\s*readonly string\[\]/);
  assert.match(apiSource, /\/api\/version/);
});

test("Capability state supports READY, AVAILABLE, NOT_DEPLOYED, and ERROR", () => {
  for (const status of ["READY", "AVAILABLE", "NOT_DEPLOYED", "ERROR"]) {
    assert.match(apiSource + integrationSource, new RegExp(`"${status}"`));
  }
  assert.match(apiSource, /response\.status === 404/);
  assert.match(integrationSource, /service version unavailable/);
  assert.match(sharedApiSource, /STUDIO_SERVICE_NOT_DEPLOYED/);
});

test("Studio gates every audited read-only module behind advertised capabilities", () => {
  for (const feature of [
    "project_intelligence",
    "copilot_center",
    "project_memory",
    "project_roadmap",
    "portfolio_strategy",
    "portfolio_resources",
    "portfolio_performance",
    "portfolio_forecast",
    "timeline",
    "storyboard",
  ]) {
    assert.match(workspaceSource, new RegExp(`feature="${feature}"`));
  }
  assert.match(canvasSource, /feature="agent_canvas"/);
});

test("Capability recovery is read-only and exposes no Runtime or generation action", () => {
  assert.doesNotMatch(integrationSource, /method:\s*"(POST|PUT|PATCH|DELETE)"/);
  assert.doesNotMatch(integrationSource, /\/api\/(video|image|execution-nodes|execution-plans)/);
  assert.match(integrationSource, /getStudioApiVersion/);
});

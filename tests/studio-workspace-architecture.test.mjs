import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workspace = fs.readFileSync(
  "src/features/studio/components/StudioWorkspace.tsx",
  "utf8",
);
const storyboard = fs.readFileSync(
  "src/features/studio/components/StudioStoryboardPanel.tsx",
  "utf8",
);
const integration = fs.readFileSync(
  "src/features/studio/components/StudioApiIntegration.tsx",
  "utf8",
);
const styles = fs.readFileSync("src/features/studio/studio.css", "utf8");

test("Studio has one project workspace with the complete module navigation", () => {
  for (const moduleName of [
    "overview",
    "canvas",
    "timeline",
    "storyboard",
    "production",
    "review",
    "delivery",
    "intelligence",
  ]) {
    assert.match(workspace, new RegExp(`labelKey: "studio\\.workspace\\.${moduleName}\\.label"`));
  }
  assert.match(
    workspace,
    /useState<StudioWorkspaceModule>\(\(\) => \{[\s\S]*?: "canvas";[\s\S]*?\}\)/,
  );
  assert.match(workspace, /studio-project-header/);
  assert.match(workspace, /studio-main-workspace/);
  assert.match(workspace, /studio\.copilot\.contextAria/);
});

test("Heavy Studio modules are loaded on demand and isolated by a module boundary", () => {
  assert.match(workspace, /const StudioCanvas = lazy/);
  assert.match(workspace, /const StudioStoryboardPanel = lazy/);
  assert.match(workspace, /const StudioPortfolioForecastCenter = lazy/);
  assert.match(workspace, /<Suspense fallback=/);
  assert.match(workspace, /StudioModuleErrorBoundary/);
  assert.match(styles, /content-visibility:\s*auto/);
});

test("Workspace status and new-project recovery states are explicit", () => {
  for (const status of ["LOADING", "READY", "UNAVAILABLE", "ERROR", "MAINTENANCE"]) {
    assert.match(workspace + integration, new RegExp(`"${status}"`));
  }
  for (const action of ["createWorkflow", "importTemplate", "askCopilot"]) {
    assert.match(workspace, new RegExp(`studio\\.workspace\\.empty\\.${action}`));
  }
  assert.match(integration, /status === "NOT_DEPLOYED"[\s\S]*studio\.status\.unavailable/);
});

test("Storyboard, Production, Review, and Delivery share existing logic with visual focus only", () => {
  for (const focus of ["storyboard", "production", "review", "delivery"]) {
    assert.match(workspace, new RegExp(`workspaceFocus="${focus}"`));
  }
  assert.match(storyboard, /data-workspace-focus=\{workspaceFocus\}/);
  assert.match(styles, /data-workspace-focus="production"/);
  assert.match(styles, /data-workspace-focus="review"/);
  assert.match(styles, /data-workspace-focus="delivery"/);
});

test("Architecture refactor adds no Provider, Billing, Credits, Job, Queue, or Runtime request", () => {
  assert.doesNotMatch(
    workspace,
    /fetch\(|\/api\/(execution|video|image|jobs|queue)|providerCost|deductCredits/i,
  );
});

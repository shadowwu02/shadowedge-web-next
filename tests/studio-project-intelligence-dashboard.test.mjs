import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioCreativeProjectIntelligence.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-project-intelligence-dashboard-api.ts",
  "utf8",
);
const dashboard = fs.readFileSync(
  "src/features/studio/components/StudioCreativeProjectIntelligenceDashboard.tsx",
  "utf8",
);
const workspace = fs.readFileSync(
  "src/features/studio/components/StudioWorkspace.tsx",
  "utf8",
);
const styles = fs.readFileSync(
  "src/features/studio/studio.css",
  "utf8",
);

test("Project Intelligence Snapshot schema covers every project health domain", () => {
  for (const field of [
    "projectId",
    "progress",
    "productionStats",
    "qualityStats",
    "costStats",
    "revisionStats",
    "riskStats",
    "updatedAt",
    "deliveryStats",
    "timelineStats",
    "copilotInsights",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  assert.match(schema, /readOnly: true/);
  assert.match(schema, /insightDraftOnly: true/);
  assert.match(schema, /creditsDeducted: false/);
});

test("Project Intelligence API is a single authenticated read endpoint", () => {
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/intelligence/);
  assert.doesNotMatch(api, /method:\s*"POST"|method:\s*"PUT"|method:\s*"PATCH"|method:\s*"DELETE"/);
  assert.doesNotMatch(api, /execute|generate|confirm|deductCredits|provider/i);
});

test("Studio renders Production, Quality, Cost, Timeline, Revision and Risk summaries", () => {
  for (const label of [
    "Project Intelligence",
    "Production",
    "Quality",
    "Cost",
    "Timeline & Delivery",
    "Revision",
    "Risk summary",
    "Copilot project insights",
  ]) {
    assert.match(dashboard, new RegExp(label.replace(/[&]/g, "\\&")));
  }
  assert.match(workspace, /<StudioCreativeProjectIntelligenceDashboard \/>/);
  assert.match(styles, /\.studio-project-intelligence/);
  assert.match(styles, /\.studio-project-intelligence-risks/);
});

test("Dashboard exposes Draft-only insights and no production controls", () => {
  assert.match(dashboard, /Draft-only · human review required/);
  assert.match(dashboard, /Read-only analytics/);
  assert.match(dashboard, /No production or workflow changes/);
  assert.match(dashboard, /No generation or credit deduction/);
  assert.doesNotMatch(dashboard, />Execute</);
  assert.doesNotMatch(dashboard, />Generate</);
  assert.doesNotMatch(dashboard, />Modify Workflow</);
  assert.doesNotMatch(dashboard, />Charge</);
});

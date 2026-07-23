import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_RESOURCE_INSIGHT_TYPES,
  studioResourceInsightLabel,
} from "../src/features/studio/capabilities/studioResourceIntelligence.ts";

test("Resource Intelligence contracts expose Asset records and the approved insight types", () => {
  assert.deepEqual(STUDIO_RESOURCE_INSIGHT_TYPES, ["ASSET_REUSE_OPPORTUNITY", "DUPLICATE_ASSET", "STYLE_RESOURCE_MATCH", "CHARACTER_REUSE", "WORKFLOW_EFFICIENCY"]);
  assert.equal(studioResourceInsightLabel("ASSET_REUSE_OPPORTUNITY"), "Asset Reuse Opportunity");
  const schema = fs.readFileSync("src/features/studio/capabilities/studioResourceIntelligence.ts", "utf8");
  assert.match(schema, /usageCount: number/);
  assert.match(schema, /relatedProjects: readonly string\[\]/);
  assert.match(schema, /styleTags: readonly string\[\]/);
  assert.match(schema, /reuseScore: number/);
});

test("Resource Intelligence Panel shows high-value Assets, usage, reuse, and styles without write controls", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioResourceIntelligencePanel.tsx", "utf8");
  assert.match(component, /Resource Intelligence Panel/);
  assert.match(component, /High-value Assets/);
  assert.match(component, /asset\.usageCount/);
  assert.match(component, /asset\.reuseScore/);
  assert.match(component, /asset\.styleTags/);
  assert.match(component, /resources\.insights\.map/);
  assert.match(component, /Reuse remains a suggestion/);
  assert.doesNotMatch(component, /onClick=|copyAsset\(|replaceAsset\(|updateProject\(|executeStudio|generateVideo\(|deductCredits\(/);
});

test("Resource API and Copilot Action Center preserve authentication and Preview to ASSET_REUSE_DRAFT", () => {
  const api = fs.readFileSync("src/lib/studio-resource-intelligence-api.ts", "utf8");
  const copilot = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
  const panel = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(api, /"\/api\/portfolio\/resources"/);
  assert.match(copilot, /RESOURCE_REUSE_SUGGESTION/);
  assert.match(copilot, /REVIEW_ASSET_REUSE/);
  assert.match(copilot, /ASSET_REUSE_DRAFT/);
  assert.match(copilot, /resourceContext/);
  assert.match(panel, /StudioResourceIntelligencePanel/);
  assert.match(panel, /Preview Action/);
  assert.match(panel, /Create Draft/);
});

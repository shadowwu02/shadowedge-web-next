import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_QUALITY_ISSUE_TYPES,
  studioQualityIssueLabel,
  studioQualityScore,
} from "../src/features/studio/capabilities/studioCreativeQuality.ts";

test("Creative Quality contract covers all governed metrics and QA issue types", () => {
  assert.deepEqual(STUDIO_QUALITY_ISSUE_TYPES, ["STYLE_DRIFT", "CHARACTER_DRIFT", "LOW_QUALITY", "WORKFLOW_MISMATCH", "USER_DISSATISFACTION"]);
  assert.equal(studioQualityIssueLabel("CHARACTER_DRIFT"), "Character Drift");
  assert.equal(studioQualityScore(82.4), "82/100");
  assert.equal(studioQualityScore(null), "Unknown");
  const schema = fs.readFileSync("src/features/studio/capabilities/studioCreativeQuality.ts", "utf8");
  for (const metric of ["visualConsistency", "styleMatch", "colorConsistency", "characterConsistency", "appearanceStability", "workflowQuality", "revisionRate", "userAcceptance", "outputQuality", "feedbackRating", "completionQuality"]) {
    assert.match(schema, new RegExp(metric));
  }
});

test("Creative Quality Panel renders scores, issues, and read-only Draft guidance", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioCreativeQualityPanel.tsx", "utf8");
  assert.match(component, /Creative Quality Panel/);
  assert.match(component, /metrics\.visualConsistency/);
  assert.match(component, /metrics\.styleMatch/);
  assert.match(component, /metrics\.colorConsistency/);
  assert.match(component, /metrics\.characterConsistency/);
  assert.match(component, /metrics\.workflowQuality/);
  assert.match(component, /metrics\.feedbackRating/);
  assert.match(component, /metrics\.completionQuality/);
  assert.match(component, /Improvement suggestions require Preview and Confirm to create a Draft/);
  assert.doesNotMatch(component, /onClick=|replaceAsset|executeStudio|generateVideo|deductCredits|retry/);
});

test("Quality API and Copilot integration preserve Preview to QUALITY_IMPROVEMENT_DRAFT boundary", () => {
  const api = fs.readFileSync("src/lib/studio-creative-quality-api.ts", "utf8");
  const copilot = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
  const panel = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/quality/);
  assert.match(copilot, /CREATIVE_QUALITY_SUGGESTION/);
  assert.match(copilot, /REVIEW_CREATIVE_QUALITY/);
  assert.match(copilot, /QUALITY_IMPROVEMENT_DRAFT/);
  assert.match(copilot, /qualityContext/);
  assert.match(panel, /StudioCreativeQualityPanel/);
  assert.match(panel, /Preview Action/);
  assert.match(panel, /Create Draft/);
});

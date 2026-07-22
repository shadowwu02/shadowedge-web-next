import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_PROJECT_EVOLUTION_CONFIDENCE,
  STUDIO_PROJECT_EVOLUTION_INSIGHT_TYPES,
  STUDIO_PROJECT_EVOLUTION_MILESTONES,
  studioProjectEvolutionMilestoneLabel,
} from "../src/features/studio/capabilities/studioProjectEvolution.ts";

test("Project Evolution contracts remain bounded", () => {
  assert.deepEqual(STUDIO_PROJECT_EVOLUTION_MILESTONES, ["PROJECT_STARTED", "STYLE_DEFINED", "FIRST_RESULT", "STRATEGY_CHANGED", "MAJOR_REVISION", "PROJECT_COMPLETED"]);
  assert.deepEqual(STUDIO_PROJECT_EVOLUTION_INSIGHT_TYPES, ["CREATIVE_DIRECTION", "STYLE_TREND", "QUALITY_TREND", "WORKFLOW_TREND"]);
  assert.deepEqual(STUDIO_PROJECT_EVOLUTION_CONFIDENCE, ["HIGH", "MEDIUM", "LOW"]);
  assert.equal(studioProjectEvolutionMilestoneLabel("STRATEGY_CHANGED"), "Strategy changed");
});

test("Studio renders a read-only Project Evolution Timeline with trends and links", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioProjectEvolutionTimeline.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(component, /Project Evolution Timeline/);
  assert.match(component, /Long-term project trends/);
  assert.match(component, /relatedStrategies/);
  assert.match(component, /relatedResults/);
  assert.match(component, /append-only, project-isolated, and read-only/);
  assert.match(parent, /<StudioProjectEvolutionTimeline projectId=\{projectId\}/);
});

test("Evolution API and Chat use authenticated retrieval without execution hooks", () => {
  const api = fs.readFileSync("src/lib/studio-project-evolution-api.ts", "utf8");
  const conversation = fs.readFileSync("src/features/studio/capabilities/studioCopilotConversation.ts", "utf8");
  const sources = [api, conversation, fs.readFileSync("src/features/studio/components/StudioProjectEvolutionTimeline.tsx", "utf8")].join("\n");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/evolution/);
  assert.match(conversation, /PROJECT_EVOLUTION/);
  assert.doesNotMatch(sources, /method:\s*"POST"|\/api\/video\/generate|executeStudioWorkflowNode|providerTransport|deductCredits|createUsageRecord/i);
});

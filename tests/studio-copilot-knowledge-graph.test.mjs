import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_PROJECT_KNOWLEDGE_NODE_TYPES,
  STUDIO_PROJECT_KNOWLEDGE_RELATION_TYPES,
  studioProjectKnowledgeNodeLabel,
  studioProjectKnowledgeNodeName,
} from "../src/features/studio/capabilities/studioProjectKnowledge.ts";

test("Project Knowledge schema exposes the bounded node and relationship contracts", () => {
  assert.deepEqual(STUDIO_PROJECT_KNOWLEDGE_NODE_TYPES, ["BRAND", "CHARACTER", "SCENE", "ASSET", "STYLE", "WORKFLOW", "MODEL", "RESULT"]);
  assert.deepEqual(STUDIO_PROJECT_KNOWLEDGE_RELATION_TYPES, ["USES", "BELONGS_TO", "GENERATED_FROM", "INSPIRED_BY", "USED_IN"]);
  assert.equal(studioProjectKnowledgeNodeLabel("WORKFLOW"), "Workflows");
  assert.equal(studioProjectKnowledgeNodeName({ referenceId: "model-1", metadata: { modelId: "seedance_2_0" } }), "seedance_2_0");
});

test("Project Intelligence View renders structure, relationships, and privacy boundary", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioProjectIntelligence.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(component, /Project Intelligence View/);
  assert.match(component, /graph\.nodes/);
  assert.match(component, /graph\.relationships/);
  assert.match(component, /Indexed from this project only/);
  assert.match(parent, /<StudioProjectIntelligence projectId=\{projectId\}/);
});

test("Project Knowledge API uses the authenticated client path", () => {
  const api = fs.readFileSync("src/lib/studio-project-knowledge-api.ts", "utf8");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/knowledge/);
  assert.match(api, /apiRequest/);
});

test("Copilot Conversation recognizes Knowledge Graph references without an execution hook", () => {
  const schema = fs.readFileSync("src/features/studio/capabilities/studioCopilotConversation.ts", "utf8");
  const sources = [
    fs.readFileSync("src/features/studio/components/StudioProjectIntelligence.tsx", "utf8"),
    fs.readFileSync("src/lib/studio-project-knowledge-api.ts", "utf8"),
  ].join("\n");
  assert.match(schema, /KNOWLEDGE_NODE/);
  assert.match(schema, /Knowledge Graph/);
  assert.doesNotMatch(sources, /\/api\/video\/generate|executeStudioWorkflowNode|providerTransport|deductCredits|createUsageRecord/i);
});

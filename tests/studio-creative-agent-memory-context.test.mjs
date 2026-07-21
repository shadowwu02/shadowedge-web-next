import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { formatStudioMemoryContent } from "../src/features/studio/capabilities/studioCreativeAgentMemory.ts";

test("Studio renders owned Project Context and exposes explicit single-memory deletion", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  const api = fs.readFileSync("src/lib/studio-agent-context-api.ts", "utf8");
  assert.match(component, /Project Context/);
  assert.match(component, /Agent remembers/);
  assert.match(component, /Save Project Context/);
  assert.match(component, /deleteProjectMemory/);
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/agent-context/);
  assert.match(api, /method: "DELETE"/);
});

test("Creative Agent Session sends projectId and shows the context snapshot used by planning", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  const schema = fs.readFileSync("src/features/studio/capabilities/studioCreativeAgentSession.ts", "utf8");
  assert.match(component, /const planningInput = \{[\s\S]*projectId,/);
  assert.match(component, /Context used/);
  assert.match(component, /planningContext\.memoryCount/);
  assert.match(schema, /StudioCreativeAgentPlanningContext/);
});

test("Memory display formats bounded context without triggering execution", () => {
  const memory = {
    memoryId: "m1",
    projectId: "p1",
    sessionId: null,
    type: "STYLE_PREFERENCE",
    content: { field: "visualStyle", value: "Cinematic noir" },
    confidence: 1,
    source: "USER_EXPLICIT_INPUT",
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
  };
  assert.equal(formatStudioMemoryContent(memory), "Cinematic noir");
  const sources = [
    fs.readFileSync("src/features/studio/capabilities/studioCreativeAgentMemory.ts", "utf8"),
    fs.readFileSync("src/lib/studio-agent-context-api.ts", "utf8"),
  ].join("\n");
  assert.doesNotMatch(sources, /\/api\/video\/generate|executeStudioWorkflowNode|deductCredits|providerTransport/i);
});

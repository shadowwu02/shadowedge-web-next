import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_COPILOT_MESSAGE_ROLES,
  STUDIO_COPILOT_RESPONSE_TYPES,
  studioCopilotContextLabel,
  studioCopilotResponseLabel,
} from "../src/features/studio/capabilities/studioCopilotConversation.ts";

test("Conversation schema exposes bounded roles, response types, and context labels", () => {
  assert.deepEqual(STUDIO_COPILOT_MESSAGE_ROLES, ["USER", "COPILOT"]);
  assert.deepEqual(STUDIO_COPILOT_RESPONSE_TYPES, ["ANSWER", "SUGGESTION", "DRAFT_PROPOSAL", "WARNING"]);
  assert.equal(studioCopilotResponseLabel("DRAFT_PROPOSAL"), "Draft proposal");
  assert.equal(studioCopilotContextLabel("AGENT_HISTORY"), "Agent History");
  assert.equal(studioCopilotContextLabel("KNOWLEDGE_NODE"), "Knowledge Graph");
  assert.equal(studioCopilotContextLabel("PROJECT_INSIGHT"), "Project Insight");
});

test("Creative Copilot Chat renders conversation, Context, and Draft Proposal", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioCopilotChat.tsx", "utf8");
  assert.match(component, /Creative Copilot Chat/);
  assert.match(component, /conversation\.messages/);
  assert.match(component, /Context used/);
  assert.match(component, /draftProposal/);
  assert.match(component, /Requires confirmation: YES/);
  assert.match(component, /Review through the Action Center/);
});

test("Chat API is authenticated through the existing client and preserves conversation identity", () => {
  const api = fs.readFileSync("src/lib/studio-copilot-conversation-api.ts", "utf8");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/copilot\/chat/);
  assert.match(api, /conversationId/);
  assert.match(api, /\/copilot\/conversations\/\$\{encodeURIComponent\(conversationId\)\}/);
});

test("Conversation remains user-controlled and has no execution, Provider, or charging hook", () => {
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  const sources = [
    fs.readFileSync("src/features/studio/components/StudioCopilotChat.tsx", "utf8"),
    fs.readFileSync("src/lib/studio-copilot-conversation-api.ts", "utf8"),
    fs.readFileSync("src/features/studio/capabilities/studioCopilotConversation.ts", "utf8"),
  ].join("\n");
  assert.match(parent, /<StudioCopilotChat projectId=\{projectId\}/);
  assert.match(sources, /No project modification, execution, generation, Provider call, or Credits charge/);
  assert.doesNotMatch(sources, /\/api\/video\/generate|executeStudioWorkflowNode|providerTransport|deductCredits|createUsageRecord/i);
});

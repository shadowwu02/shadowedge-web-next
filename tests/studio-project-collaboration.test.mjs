import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  PROJECT_MEMBER_ROLES,
  PROJECT_PERMISSIONS,
} from "../src/features/studio/capabilities/studioProjectCollaboration.ts";

const schema = fs.readFileSync("src/features/studio/capabilities/studioProjectCollaboration.ts", "utf8");
const api = fs.readFileSync("src/lib/studio-project-collaboration-api.ts", "utf8");
const component = fs.readFileSync("src/features/studio/components/StudioProjectMembersPanel.tsx", "utf8");
const workspace = fs.readFileSync("src/features/studio/components/StudioWorkspace.tsx", "utf8");
const version = fs.readFileSync("src/lib/studio-api-version.ts", "utf8");

test("Project Members model exposes the requested roles and permission vocabulary", () => {
  assert.deepEqual(PROJECT_MEMBER_ROLES, [
    "OWNER",
    "CREATIVE_DIRECTOR",
    "EDITOR",
    "REVIEWER",
    "VIEWER",
  ]);
  assert.deepEqual(PROJECT_PERMISSIONS, ["VIEW", "COMMENT", "DRAFT_EDIT", "APPROVE", "MANAGE"]);
  for (const field of ["memberId", "projectId", "userId", "role", "permissions", "createdAt"]) {
    assert.match(schema, new RegExp(field));
  }
});

test("Project Members API uses authenticated project-scoped GET and POST routes", () => {
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/members/);
  assert.match(api, /method: "POST"/);
  assert.match(version, /project_collaboration/);
});

test("Studio exposes role and permission details with explicit management controls", () => {
  assert.match(workspace, /StudioProjectMembersPanel/);
  assert.match(component, /Project Members/);
  assert.match(component, /Add member/);
  assert.match(component, /permissions\.includes\("MANAGE"\)/);
  assert.match(component, /Execution remains separately confirmed/);
});

test("collaboration UI has no execution, Provider, or Credits mutation path", () => {
  assert.doesNotMatch(
    `${schema}\n${api}`,
    /executeNode|generateVideo|submitProvider|createJob|startQueue|deductCredits|chargeCredits/,
  );
});

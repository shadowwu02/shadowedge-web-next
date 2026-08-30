import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("Video Workspace scope is stable scalar identity rather than Auth object identity", () => {
  const source = read("src/components/video/VideoWorkspace.tsx");
  assert.match(source, /normalizeVideoWorkspaceAuthorityScope\(\{ userId: user\?\.id, tenantId: tenantAccess\?\.tenant\?\.id \}\)/);
  assert.match(source, /\[tenantAccess\?\.tenant\?\.id, user\?\.id\]/);
  assert.match(source, /getVideoWorkspaceAuthorityScopeKey\(workspaceAuthorityScope\)/);
});

test("same-scope catalog refresh keeps last-known-good UI and fails generation authority closed", () => {
  const source = read("src/components/video/VideoWorkspace.tsx");
  assert.match(source, /const readyWorkspaceScopeKeyRef = useRef\(""\)/);
  assert.match(source, /const isInitialLoadForScope = readyWorkspaceScopeKeyRef\.current !== workspaceAuthorityScopeKey/);
  assert.match(source, /if \(isInitialLoadForScope\) \{[\s\S]*setCatalogStatus\("loading"\)/);
  assert.match(source, /setWorkspaceAuthority\(null\);\s*setWorkspaceAuthorityStatus\("unavailable"\);\s*if \(isInitialLoadForScope\)/);
});

test("no three-second session or workspace initialization timer exists", () => {
  const auth = read("src/hooks/useAuthSession.ts");
  const workspace = read("src/components/video/VideoWorkspace.tsx");
  assert.doesNotMatch(auth, /3000|3_000/);
  assert.doesNotMatch(workspace.slice(workspace.indexOf("export function VideoWorkspace"), workspace.indexOf("const focusPromptStudioImportTarget")), /3000|3_000|setInterval/);
});

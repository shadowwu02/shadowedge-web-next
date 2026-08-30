import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("verified Auth state is shared by every useAuthSession consumer", () => {
  const auth = read("src/lib/auth.ts");
  const authApi = read("src/lib/auth-api.ts");
  const hook = read("src/hooks/useAuthSession.ts");

  assert.match(auth, /let verifiedAuthToken = ""/);
  assert.match(auth, /getCachedAuthSessionState/);
  assert.match(authApi, /markAuthSessionVerified\(getStoredAuthToken\(\)\)/);
  assert.match(hook, /const syncCachedSession = useCallback/);
  assert.match(hook, /function handleProfileUpdated\(\) \{\s*syncCachedSession\(\)/);
});

test("Header and Studio controls use the same verified isSignedIn boundary", () => {
  const topBar = read("src/components/layout/TopBar.tsx");
  const toolbar = read("src/features/studio/components/StudioToolbar.tsx");

  assert.match(topBar, /const \{ isSignedIn, profile \} = useAuthSession\(\)/);
  assert.match(topBar, /isSignedIn && profile\?\.email/);
  assert.match(toolbar, /disabled=\{!isSignedIn \|\| projectBusy\}/);
  assert.match(toolbar, /isSignedIn[\s\S]*projectId \? t\("studio\.toolbar\.cloudProject"\) : t\("studio\.toolbar\.localFallback"\)/);
});

test("cross-tab storage changes revalidate an unverified stored token", () => {
  const hook = read("src/hooks/useAuthSession.ts");

  assert.match(hook, /function handleStorageUpdated\(event: StorageEvent\)/);
  assert.match(hook, /if \(!isAuthSessionStorageKey\(event\.key\)\) return/);
  assert.match(
    hook,
    /if \(next\.token && !next\.isProfileVerified\) \{[\s\S]*void refresh\(\)/,
  );
  assert.doesNotMatch(hook, /if \(next\.token\) \{\s*setUser\(null\)/);
  assert.match(hook, /window\.addEventListener\("storage", handleStorageUpdated\)/);
});

test("verified same-session storage events preserve workspace authority identity", () => {
  const hook = read("src/hooks/useAuthSession.ts");
  const auth = read("src/lib/auth.ts");
  assert.match(auth, /export function isAuthSessionStorageKey/);
  assert.match(auth, /key === null \|\| AUTH_SESSION_STORAGE_KEYS\.has\(key\)/);
  assert.match(hook, /if \(next\.token && !next\.isProfileVerified\)/);
  assert.match(hook, /else if \(!next\.token\)/);
});

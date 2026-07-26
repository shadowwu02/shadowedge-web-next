import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspace = read("src/components/video/VideoWorkspace.tsx");
const dictionary = read("src/i18n/dictionary.ts");

test("Edit Video and Motion Control open localized Beta Coming Soon previews", () => {
  assert.match(workspace, /key: "edit"[\s\S]*preview: true/);
  assert.match(workspace, /key: "motion"[\s\S]*preview: true/);
  assert.doesNotMatch(workspace, /disabled: true, key: "(?:edit|motion)"/);
  assert.match(workspace, /data-testid="video-capability-coming-soon"/);
  assert.match(workspace, /video\.workspace\.betaComingSoon/);
  assert.match(workspace, /video\.workspace\.plannedDirection/);
});

test("capability previews explain planned directions and preserve the Create Video path", () => {
  for (const key of [
    "video.workspace.editVideo.direction.timeline",
    "video.workspace.editVideo.direction.guided",
    "video.workspace.editVideo.direction.export",
    "video.workspace.motionControl.direction.camera",
    "video.workspace.motionControl.direction.reference",
    "video.workspace.motionControl.direction.validation",
  ]) {
    assert.match(workspace, new RegExp(key.replaceAll(".", "\\.")));
  }
  assert.match(workspace, /onClick=\{\(\) => setWorkspaceMode\("create"\)\}/);
  assert.match(workspace, /video\.workspace\.createReady/);
});

test("coming soon content is bilingual with complete key parity", () => {
  const keys = [...dictionary.matchAll(/^\s*"(video\.workspace\.(?:beta|capability|planned|editVideo\.|motionControl\.|createReady|comingSoonBoundary|backToCreate)[^"]*)":/gm)]
    .map((match) => match[1]);
  const unique = new Set(keys);
  assert.ok(unique.size >= 13);
  for (const key of unique) {
    assert.equal(keys.filter((candidate) => candidate === key).length, 2, `${key} must exist in both locales`);
  }
  assert.match(dictionary, /"video\.workspace\.betaComingSoon": "Beta Coming Soon"/);
  assert.match(dictionary, /"video\.workspace\.betaComingSoon": "Beta 即将开放"/);
});

test("coming soon cards keep a responsive mobile-first layout", () => {
  assert.match(workspace, /grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1/);
  assert.match(workspace, /flex min-w-0 flex-wrap items-center/);
  assert.match(workspace, /break-words text-sm/);
  assert.match(workspace, /w-full rounded-2xl/);
});

test("capability polish adds no Provider, generation, Job, Runtime, Billing, or Credits action", () => {
  const start = workspace.indexOf('data-testid="video-capability-coming-soon"');
  const end = workspace.indexOf("<VideoRemakeWorkspace", start);
  const preview = workspace.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(preview, /generateVideo|createJob|startRuntime|deductCredits|billing|providerRequest/i);
});

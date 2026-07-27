import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspace = read("src/components/video/VideoWorkspace.tsx");
const panel = read("src/components/video/VideoReferenceTransformPanel.tsx");
const api = read("src/lib/video-reference-transform-api.ts");
const types = read("src/types/video-reference-transform.ts");
const dictionary = read("src/i18n/dictionary.ts");

test("Video Workspace exposes Video Reference Transform without replacing Create Video", () => {
  assert.match(workspace, /key: "create"/);
  assert.match(workspace, /key: "transform"/);
  assert.match(workspace, /<VideoReferenceTransformPanel \/>/);
  assert.doesNotMatch(panel, /Video Editor|Precise Video Edit|Object Edit/);
});

test("MVP accepts one owned Asset and no external URL field", () => {
  assert.match(panel, /listMediaAssets\(\{ type: "video", status: "ready"/);
  assert.match(panel, /sourceAssetId: source\.id/);
  assert.match(panel, /providerMediaId\(source\)/);
  assert.doesNotMatch(panel, /type="url"|externalUrl|sourceUrl/);
  assert.match(panel, /assets\.find\(\(asset\) => asset\.id === sourceAssetId\)/);
});

test("Preview and Confirm use the dedicated controlled API", () => {
  assert.match(api, /\/api\/video\/reference-transform\/preview/);
  assert.match(api, /\/api\/video\/reference-transform\/confirm/);
  assert.match(api, /\/api\/video\/reference-transform\/status/);
  assert.match(api, /\/api\/video\/reference-transform\/history/);
  assert.match(panel, /preview\.status !== "READY" \|\| preview\.costStatus !== "VERIFIED"/);
  assert.match(dictionary, /Preview does not charge/);
  assert.match(dictionary, /预览不扣费/);
});

test("Operation and lineage contracts remain separate from Video Generate", () => {
  assert.match(types, /operation: "VIDEO_REFERENCE_TRANSFORM"/);
  for (const status of ["PENDING", "SUBMITTING", "SUBMITTED", "PROCESSING", "COMPLETED", "FAILED", "UNCERTAIN"]) {
    assert.match(types, new RegExp(`"${status}"`));
  }
  for (const field of ["sourceAssetId", "sourceJobId", "operationId", "providerMediaId", "providerJobId", "resultAssetId", "promptSnapshot", "paramsSnapshot"]) {
    assert.match(types, new RegExp(field));
  }
});

test("Video Reference Transform copy is bilingual", () => {
  const keys = [...dictionary.matchAll(/^\s*"(video\.transform\.[^"]+)":/gm)].map((match) => match[1]);
  const unique = new Set(keys);
  assert.ok(unique.size >= 20);
  for (const key of unique) assert.equal(keys.filter((candidate) => candidate === key).length, 2, `${key} must exist in both locales`);
  assert.match(dictionary, /"video\.transform\.title": "Video Reference Transform"/);
  assert.match(dictionary, /"video\.transform\.title": "视频参考转换"/);
});

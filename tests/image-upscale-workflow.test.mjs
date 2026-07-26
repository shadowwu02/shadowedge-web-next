import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const panel = read("src/components/image/ImageUpscalePanel.tsx");
const workspace = read("src/components/image/ImageWorkspace.tsx");
const output = read("src/components/image/ImageOutputStage.tsx");
const assets = read("src/components/assets/AssetLibraryPage.tsx");
const api = read("src/lib/image-upscale-api.ts");
const dictionary = read("src/i18n/dictionary.ts");

test("completed Image Results and owned Assets expose Upscale Preview", () => {
  assert.match(output, /onUpscale/);
  assert.match(output, /image\.actions\.upscale/);
  assert.match(assets, /saveImageUpscaleAssetHandoff/);
  assert.match(assets, /onUpscale=\{handleUpscale\}/);
  assert.match(workspace, /ImageUpscalePanel/);
});

test("Upscale UI preserves Preview then explicit Confirm boundary", () => {
  assert.match(panel, /createImageUpscalePreview/);
  assert.match(panel, /preview\.status !== "READY"/);
  assert.match(panel, /confirmImageUpscale/);
  assert.match(panel, /Credits are charged only after confirmation|image\.upscale\.chargeBoundary/);
  assert.doesNotMatch(panel, /generateImage\(/);
});

test("Upscale API uses a dedicated operation contract", () => {
  assert.match(api, /\/api\/image\/upscale\/preview/);
  assert.match(api, /\/api\/image\/upscale\/confirm/);
  assert.match(api, /\/api\/image\/upscale\/status\//);
  assert.match(api, /\/api\/image\/upscale\/history/);
  assert.doesNotMatch(api, /\/api\/image\/generate/);
});

test("Upscale user-facing copy has English and Chinese coverage", () => {
  assert.equal((dictionary.match(/"image\.actions\.upscale"/g) || []).length, 2);
  assert.equal((dictionary.match(/"image\.upscale\.confirm"/g) || []).length, 2);
  assert.equal((dictionary.match(/"image\.upscale\.providerBlocked"/g) || []).length, 2);
});

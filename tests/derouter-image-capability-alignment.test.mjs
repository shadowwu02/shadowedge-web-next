import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");

function source(...parts) {
  return fs.readFileSync(path.join(root, ...parts), "utf8");
}

test("Image Workspace sends only explicitly selected reference images", () => {
  const hook = source("src", "hooks", "useImageGeneration.ts");
  const api = source("src", "lib", "image-api.ts");
  assert.match(hook, /referenceImageAssetIds\s*=\s*readyReferences/);
  assert.match(hook, /referenceImageAssetIds,/);
  assert.match(api, /reference_image_asset_ids:\s*\(input\.referenceImageAssetIds\s*\|\|\s*\[\]\)\.filter/);
  assert.doesNotMatch(hook, /allReadyReferences|allAttachments/);
});

test("unsupported ratio UI is hidden and stale ratio values normalize to empty", () => {
  const panel = source("src", "components", "image", "ImagePromptPanel.tsx");
  const rules = source("src", "lib", "image", "imageModelRules.ts");
  assert.match(panel, /\{ratios\.length\s*\?\s*\(/);
  assert.match(rules, /if \(!allowed\.length\) return ""/);
  assert.match(rules, /ratios\[0\] \|\| ""/);
});

test("batch UI is rendered only when Provider capability supports more than one result", () => {
  const panel = source("src", "components", "image", "ImagePromptPanel.tsx");
  const selector = source("src", "components", "image", "ImageModelSelector.tsx");
  assert.match(panel, /maxBatchCount > 1/);
  assert.match(selector, /model\.capabilities\.maxBatchCount > 1/);
});

test("resolution UI remains capability-driven instead of hard-coded", () => {
  const panel = source("src", "components", "image", "ImagePromptPanel.tsx");
  const rules = source("src", "lib", "image", "imageModelRules.ts");
  assert.match(panel, /customerCapabilities\.availableResolutions/);
  assert.match(panel, /selectedModel\?\.capabilities\.resolutionOptions/);
  assert.match(panel, /resolutions\.map\(\(resolution\)/);
  assert.match(panel, /resolutionLabel\(resolution\)/);
  assert.match(rules, /pickResolutionOptions/);
  assert.match(panel, /generation_cost_tier/);
  assert.match(panel, /image\.params\.generationTier/);
  assert.match(panel, /image\.params\.generationTierHint/);
  assert.doesNotMatch(panel, /\[\s*["']1k["']\s*,\s*["']2k["']\s*,\s*["']4k["']\s*\]/i);
});

test("Image detail presents requested tier separately from actual materialized dimensions", () => {
  const detail = source("src", "components", "image", "ImageOutputDetailPanel.tsx");
  assert.match(detail, /resolutionTier/);
  assert.match(detail, /actualWidth/);
  assert.match(detail, /actualHeight/);
  assert.match(detail, /actualSizeBytes/);
  assert.match(detail, /image\.detail\.requestedTier/);
  assert.match(detail, /image\.detail\.actualSize/);
  assert.doesNotMatch(detail, /requestedSize\.toUpperCase/);
  assert.match(detail, /!isCompleted\s*&&\s*job\.errorMessage/);
});

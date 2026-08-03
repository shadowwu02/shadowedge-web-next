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
  assert.match(hook, /referenceImages:\s*readyReferences\.map/);
  assert.match(api, /reference_images:\s*input\.referenceImages\s*\|\|\s*\[\]/);
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
  assert.match(panel, /selectedModel\?\.capabilities\.resolutions/);
  assert.match(panel, /selectedModel\?\.capabilities\.resolutionOptions/);
  assert.match(panel, /resolutions\.map\(\(resolution\)/);
  assert.match(panel, /resolutionLabel\(resolution\)/);
  assert.match(rules, /pickResolutionOptions/);
  assert.doesNotMatch(panel, /\[\s*["']1k["']\s*,\s*["']2k["']\s*,\s*["']4k["']\s*\]/i);
});

test("Image detail separates requested tier from actual materialized dimensions", () => {
  const detail = source("src", "components", "image", "ImageOutputDetailPanel.tsx");
  assert.match(detail, /requestedSize/);
  assert.match(detail, /actualWidth/);
  assert.match(detail, /actualHeight/);
  assert.match(detail, /actualSizeBytes/);
  assert.match(detail, /image\.detail\.requestedSize/);
  assert.match(detail, /image\.detail\.actualSize/);
});

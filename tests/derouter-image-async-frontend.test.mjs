import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");

test("Image create response preserves outputs and asynchronous tracking metadata", () => {
  const api = fs.readFileSync(path.join(root, "src", "lib", "image-api.ts"), "utf8");
  const types = fs.readFileSync(path.join(root, "src", "types", "image.ts"), "utf8");
  assert.match(api, /data\.outputUrls,\s*data\.output_urls/);
  assert.match(api, /outputUrl,/);
  assert.match(api, /outputUrls:\s*Array\.from/);
  assert.match(api, /asyncRuntime:/);
  assert.match(api, /outboxId:/);
  assert.match(types, /outputUrls:\s*string\[\]/);
  assert.match(types, /asyncRuntime\?:\s*string/);
});

test("Image hook retains create outputs and polls processing jobs", () => {
  const hook = fs.readFileSync(path.join(root, "src", "hooks", "useImageGeneration.ts"), "utf8");
  const history = fs.readFileSync(path.join(root, "src", "lib", "image", "imageHistoryUtils.ts"), "utf8");
  assert.match(hook, /outputUrl:\s*response\.outputUrl/);
  assert.match(hook, /outputUrls:\s*response\.outputUrls/);
  assert.match(hook, /isImageActiveStatus\(currentJob\.status\)/);
  assert.match(hook, /const status = await refreshStatus\(jobId\)/);
  assert.match(history, /"processing"/);
  assert.match(history, /"materialization_pending"/);
  assert.match(fs.readFileSync(path.join(root, "src", "types", "image.ts"), "utf8"), /"materialization_pending"/);
  assert.match(history, /const completedStatuses = new Set\(\["completed"/);
});

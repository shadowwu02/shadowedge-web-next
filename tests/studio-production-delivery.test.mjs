import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioProductionDelivery.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-production-delivery-api.ts",
  "utf8",
);
const panel = fs.readFileSync(
  "src/features/studio/components/StudioStoryboardPanel.tsx",
  "utf8",
) + fs.readFileSync("src/i18n/productPhase2Dictionary.ts", "utf8");
const styles = fs.readFileSync(
  "src/features/studio/studio.css",
  "utf8",
);

test("Delivery Package schema includes immutable versioned approved-result references", () => {
  for (const field of [
    "packageId",
    "productionId",
    "version",
    "outputs",
    "assets",
    "metadata",
    "status",
    "createdAt",
    "timelineReferences",
    "qualitySummary",
    "exportPreview",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const status of ["DRAFT", "READY", "DELIVERED", "ARCHIVED"]) {
    assert.match(schema, new RegExp(`"${status}"`));
  }
  assert.match(schema, /versionAppendOnly: true/);
  assert.match(schema, /approvedResultsOnly: true/);
});

test("Delivery client exposes authenticated list and explicit version creation APIs", () => {
  assert.match(api, /\/delivery-packages/);
  assert.match(api, /\/delivery-package/);
  assert.match(api, /method: "POST"/);
  assert.match(api, /JSON\.stringify\(\{ version \}\)/);
  assert.doesNotMatch(api, /publish|upload|share|deleteVersion|deductCredits|submitProvider/);
});

test("Delivery Workspace renders Version, Outputs, Assets, Quality, Status, and Export Preview", () => {
  for (const label of [
    "Delivery Workspace",
    "Approved Outputs",
    "Assets",
    "Timeline Refs",
    "Quality Checks",
    "Export Preview",
    "Delivery Version history",
    "Create Revision",
    "Create Major",
  ]) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(panel, /Approve Production Review before creating a versioned Delivery Package/);
  assert.match(panel, /Append-only versions/);
  assert.match(styles, /\.studio-production-delivery/);
  assert.match(styles, /\.studio-production-delivery-export/);
});

test("Delivery UI has no publish, external upload, share, delete, or Credits control", () => {
  assert.doesNotMatch(panel, />Publish</);
  assert.doesNotMatch(panel, />Upload Delivery</);
  assert.doesNotMatch(panel, />Share Package</);
  assert.doesNotMatch(panel, />Delete Version</);
  assert.doesNotMatch(panel, />Deliver Now</);
  assert.match(panel, /Nothing was published, uploaded, shared, or charged/);
});

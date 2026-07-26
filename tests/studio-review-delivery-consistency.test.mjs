import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const panel = fs.readFileSync(
  "src/features/studio/components/StudioStoryboardPanel.tsx",
  "utf8",
);
const reviewApi = fs.readFileSync(
  "src/lib/studio-production-review-api.ts",
  "utf8",
);

test("Studio Review uses the active Production run and never keeps an unbounded BUILDING state", () => {
  assert.match(panel, /activeProductionRuntime\.handoff\.runId/);
  assert.match(panel, /productionReviewState\.productionRunId === activeProductionRuntime\?\.handoff\.runId/);
  assert.match(panel, /productionDeliveryState\.reviewId === activeProductionReview\?\.reviewId/);
  assert.match(panel, /productionReviewLoadStatus/);
  assert.match(panel, /"IDLE" \| "PENDING" \| "READY" \| "FAILED"/);
  assert.match(panel, /setProductionReviewLoadStatus\("FAILED"\)/);
  assert.match(reviewApi, /setTimeout/);
  assert.match(reviewApi, /controller\.abort/);
  assert.match(reviewApi, /productionRunId=/);
});

test("Delivery and Client Review remain downstream of the canonical approved Review", () => {
  assert.match(panel, /activeProductionReview\?\.status !== "APPROVED"/);
  assert.match(panel, /getStudioProductionDeliveryPackages/);
  assert.match(panel, /selectedReviewPackageId/);
  assert.match(panel, /getStudioClientReviewSession/);
});

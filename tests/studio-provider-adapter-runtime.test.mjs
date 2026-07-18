import assert from "node:assert/strict";
import test from "node:test";
import { getCapabilityCostRule } from "../src/features/studio/capabilities/studioCapabilities.ts";
import {
  normalizeProviderError,
} from "../src/features/studio/runtime/providers/providerAdapter.ts";
import {
  getStudioProvider,
  resolveProviderForCapability,
} from "../src/features/studio/runtime/providers/providerRegistry.ts";
import {
  cancelProviderJob,
  getProviderJobStatus,
  submitProviderJob,
} from "../src/features/studio/runtime/providers/providerRuntime.ts";

function requireResolution(value) {
  assert.equal(value.ok, true);
  if (!value.ok) throw new Error(value.error.message);
  return value;
}

test("video_edit resolves to the unified local Mock Provider", async () => {
  const resolution = requireResolution(
    resolveProviderForCapability({
      capability: "video_edit",
      mode: "video_to_video",
    }),
  );
  assert.equal(resolution.provider.providerId, "mock");
  assert.equal(resolution.adapter.key, "mock_provider");
  assert.equal(resolution.adapter.kind, "mock");

  const submitted = await submitProviderJob(resolution, {
    capability: "video_edit",
    projectId: "project-edit",
    nodeId: "edit-1",
    mode: "video_to_video",
    payload: {
      sourceVideo: {
        url: "https://cdn.example.com/source.mp4",
        thumbnail: "https://cdn.example.com/source.jpg",
      },
    },
  });
  assert.equal(submitted.ok, true);
  if (!submitted.ok) return;
  assert.equal(submitted.result.providerCalled, false);
  assert.ok(submitted.result.identity.clientJobId);
  assert.ok(submitted.result.identity.providerJobId);
  assert.ok(submitted.result.identity.databaseJobId);
  assert.equal(
    submitted.result.identity.statusJobId,
    submitted.result.identity.databaseJobId,
  );

  const completed = await getProviderJobStatus(
    resolution,
    submitted.result.identity,
  );
  assert.equal(completed.ok, true);
  if (!completed.ok) return;
  assert.equal(completed.result.status, "completed");
  assert.equal(
    completed.result.output?.videoUrl,
    "https://cdn.example.com/source.mp4",
  );
});

test("motion_control resolves through the same adapter and supports cancel", async () => {
  const resolution = requireResolution(
    resolveProviderForCapability({
      capability: "motion_control",
      providerId: "mock",
      mode: "motion_transfer",
    }),
  );
  const submitted = await submitProviderJob(resolution, {
    capability: "motion_control",
    projectId: "project-motion",
    nodeId: "motion-1",
    mode: "motion_transfer",
    payload: {
      sourceImage: { url: "https://cdn.example.com/character.jpg" },
      motionReferenceVideo: {
        url: "https://cdn.example.com/motion.mp4",
      },
    },
  });
  assert.equal(submitted.ok, true);
  if (!submitted.ok) return;
  const cancelled = await cancelProviderJob(
    resolution,
    submitted.result.identity,
  );
  assert.equal(cancelled.ok, true);
  if (!cancelled.ok) return;
  assert.equal(cancelled.result.status, "cancelled");
  assert.equal(cancelled.result.errorCode, "PROVIDER_CANCELLED");
  assert.equal(cancelled.result.providerCalled, false);
});

test("metadata-only or unknown providers fail closed", () => {
  assert.equal(getStudioProvider("higgsfield")?.status, "metadata_only");
  for (const providerId of ["higgsfield", "missing-provider"]) {
    const resolution = resolveProviderForCapability({
      capability: "camera_control",
      providerId,
      mode: "preset",
    });
    assert.equal(resolution.ok, false);
    if (resolution.ok) continue;
    assert.equal(
      resolution.error.code,
      "CAPABILITY_PROVIDER_UNAVAILABLE",
    );
  }
});

test("provider errors normalize to the shared error model", () => {
  assert.equal(
    normalizeProviderError({ status: 429, message: "slow down" }).code,
    "PROVIDER_RATE_LIMIT",
  );
  assert.equal(
    normalizeProviderError({ status: 404, code: "REMOTE_JOB_NOT_FOUND" })
      .code,
    "PROVIDER_JOB_NOT_FOUND",
  );
  assert.equal(
    normalizeProviderError({ status: 503, message: "unavailable" }).code,
    "PROVIDER_TEMPORARY",
  );
  assert.equal(
    getCapabilityCostRule("motion_control", "mock")?.providerId,
    "mock",
  );
});

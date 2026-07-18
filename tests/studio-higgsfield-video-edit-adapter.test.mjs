import assert from "node:assert/strict";
import test from "node:test";
import { getCapabilityCostRule } from "../src/features/studio/capabilities/studioCapabilities.ts";
import {
  createHiggsfieldVideoEditAdapter,
} from "../src/features/studio/runtime/providers/higgsfieldVideoEditAdapter.ts";
import { resolveProviderForCapability } from "../src/features/studio/runtime/providers/providerRegistry.ts";

const readyConfig = {
  capability: "video_edit",
  providerId: "higgsfield",
  adapterKey: "higgsfield_video_edit",
  enabled: true,
  models: [
    { id: "contract_test_edit", label: "Contract Test Edit", enabled: true },
  ],
  limits: {
    acceptedMimeTypes: ["video/mp4"],
    acceptedExtensions: [".mp4"],
    durations: [5],
    ratios: ["16:9"],
    maxFileBytes: 20_000_000,
  },
  cost: { status: "configured", credits: 1 },
  routes: {
    submit: "/contract-test/submit",
    status: "/contract-test/:statusJobId",
  },
};

const validRequest = {
  capability: "video_edit",
  projectId: "project-hf-1",
  nodeId: "video-edit-hf-1",
  mode: "video_to_video",
  payload: {
    sourceVideo: {
      assetId: "asset-video-1",
      sourceNodeId: "asset-node-1",
      url: "https://cdn.example.com/input.mp4",
      mimeType: "video/mp4",
      sizeBytes: 10_000_000,
      duration: 5,
    },
    prompt: "Change the daylight scene to dusk.",
    model: "contract_test_edit",
    duration: 5,
    ratio: "16:9",
    parameters: {},
  },
};

test("Higgsfield adapter maps submit, status, and Job Identity through an injected transport", async () => {
  const calls = [];
  const transport = {
    async submit(payload) {
      calls.push(["submit", payload]);
      return {
        clientJobId: "client-hf-1",
        databaseJobId: "db-hf-1",
        providerJobId: "provider-hf-1",
        statusJobId: "db-hf-1",
        status: "queued",
      };
    },
    async status(statusJobId) {
      calls.push(["status", statusJobId]);
      return {
        databaseJobId: "",
        providerJobId: "",
        status: "completed",
        videoUrl: "https://cdn.example.com/output.mp4",
        thumbnail: "https://cdn.example.com/output.jpg",
      };
    },
    async cancel(statusJobId) {
      calls.push(["cancel", statusJobId]);
      return {
        databaseJobId: "",
        providerJobId: "",
        status: "cancelled",
      };
    },
  };
  const adapter = createHiggsfieldVideoEditAdapter({
    config: readyConfig,
    transport,
  });
  const submitted = await adapter.submit(validRequest);
  assert.equal(submitted.status, "queued");
  assert.equal(submitted.identity.databaseJobId, "db-hf-1");
  assert.equal(submitted.identity.providerJobId, "provider-hf-1");
  assert.equal(submitted.identity.statusJobId, "db-hf-1");
  assert.equal(submitted.providerCalled, true);

  const mapped = calls[0][1];
  assert.equal(mapped.providerId, "higgsfield");
  assert.equal(mapped.sourceVideo.mimeType, "video/mp4");
  assert.equal(mapped.duration, 5);
  assert.equal(mapped.ratio, "16:9");

  const completed = await adapter.status(submitted.identity);
  assert.equal(completed.status, "completed");
  assert.equal(
    completed.output?.videoUrl,
    "https://cdn.example.com/output.mp4",
  );
  assert.deepEqual(completed.identity, submitted.identity);
});

test("disabled Higgsfield config never reaches transport", async () => {
  let transportCalls = 0;
  const adapter = createHiggsfieldVideoEditAdapter({
    config: { ...readyConfig, enabled: false },
    transport: {
      async submit() {
        transportCalls += 1;
        throw new Error("must not run");
      },
      async status() {
        transportCalls += 1;
        throw new Error("must not run");
      },
      async cancel() {
        transportCalls += 1;
        throw new Error("must not run");
      },
    },
  });
  await assert.rejects(
    adapter.submit(validRequest),
    (error) => adapter.normalizeError(error).code === "PROVIDER_EXECUTION_DISABLED",
  );
  assert.equal(transportCalls, 0);
});

test("invalid media fails before job creation", async () => {
  let submitCalls = 0;
  const adapter = createHiggsfieldVideoEditAdapter({
    config: readyConfig,
    transport: {
      async submit() {
        submitCalls += 1;
        throw new Error("must not run");
      },
      async status() {
        throw new Error("unused");
      },
      async cancel() {
        throw new Error("unused");
      },
    },
  });
  const invalidRequest = {
    ...validRequest,
    payload: {
      ...validRequest.payload,
      sourceVideo: {
        ...validRequest.payload.sourceVideo,
        mimeType: "video/avi",
      },
    },
  };
  await assert.rejects(
    adapter.submit(invalidRequest),
    (error) => adapter.normalizeError(error).code === "PROVIDER_INVALID_INPUT",
  );
  assert.equal(submitCalls, 0);
});

test("registry and cost rules remain fail-closed without approved rollout", () => {
  const resolution = resolveProviderForCapability({
    capability: "video_edit",
    providerId: "higgsfield",
    mode: "video_to_video",
  });
  assert.equal(resolution.ok, false);
  if (!resolution.ok) {
    assert.equal(resolution.error.code, "PROVIDER_EXECUTION_DISABLED");
  }
  const cost = getCapabilityCostRule("video_edit", "higgsfield");
  assert.equal(cost?.model, "kling_o1_video_edit");
  assert.equal(cost?.creditsRule, "future");
  assert.equal(cost?.credits, undefined);
});

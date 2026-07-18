import assert from "node:assert/strict";

import {
  getVideoStatusWithVisibilityGrace,
  normalizeVideoJobIdentity,
} from "../src/lib/video/videoJobIdentity.ts";

const DB_JOB_ID = "c692e3e8-cc53-4d8f-a92f-77f4d2182660";
const PROVIDER_JOB_ID = "hfv_1784360296529_3661d598e326";

async function testCreatePollCompleteContract() {
  const generateResponse = {
    jobId: PROVIDER_JOB_ID,
    providerJobId: PROVIDER_JOB_ID,
    dbJobId: DB_JOB_ID,
    status: "queued",
  };
  const identity = normalizeVideoJobIdentity(generateResponse);

  assert.deepEqual(identity, {
    jobId: PROVIDER_JOB_ID,
    databaseJobId: DB_JOB_ID,
    providerJobId: PROVIDER_JOB_ID,
    statusJobId: DB_JOB_ID,
  });

  const requestedStatusIds = [];
  const visibilityEvents = [];
  let requestCount = 0;

  const status = await getVideoStatusWithVisibilityGrace({
    identity,
    maxAttempts: 3,
    async getStatus(statusJobId) {
      requestedStatusIds.push(statusJobId);
      requestCount += 1;

      if (requestCount === 1) {
        throw Object.assign(
          new Error("VIDEO_JOB_NOT_FOUND: Video job was not found for this account."),
          { code: "VIDEO_JOB_NOT_FOUND", status: 404 },
        );
      }

      return {
        data: {
          dbJobId: DB_JOB_ID,
          jobId: PROVIDER_JOB_ID,
          providerJobId: PROVIDER_JOB_ID,
          status: "completed",
          videoUrl: "https://cdn.example.test/video.mp4",
        },
      };
    },
    onNotVisible(progress) {
      visibilityEvents.push(progress);
    },
    async wait() {},
  });

  assert.deepEqual(requestedStatusIds, [DB_JOB_ID, DB_JOB_ID]);
  assert.equal(visibilityEvents.length, 1);
  assert.equal(visibilityEvents[0].code, "JOB_NOT_VISIBLE_YET");
  assert.equal(status.data.status, "completed");
  assert.equal(status.data.videoUrl, "https://cdn.example.test/video.mp4");
}

async function testConfirmedNotFoundRemainsDistinct() {
  const identity = normalizeVideoJobIdentity({
    jobId: PROVIDER_JOB_ID,
    dbJobId: DB_JOB_ID,
  });
  let requestCount = 0;

  await assert.rejects(
    getVideoStatusWithVisibilityGrace({
      identity,
      maxAttempts: 3,
      async getStatus() {
        requestCount += 1;
        throw Object.assign(new Error("Video job was not found for this account."), {
          code: "VIDEO_JOB_NOT_FOUND",
          status: 404,
        });
      },
      async wait() {},
    }),
    (error) => error.code === "VIDEO_JOB_NOT_FOUND",
  );

  assert.equal(requestCount, 3);
}

function testLegacyIdentityFallback() {
  assert.deepEqual(normalizeVideoJobIdentity({ jobId: "legacy-job-id" }), {
    jobId: "legacy-job-id",
    statusJobId: "legacy-job-id",
  });
}

await testCreatePollCompleteContract();
await testConfirmedNotFoundRemainsDistinct();
testLegacyIdentityFallback();
console.log("studio video job identity contract tests passed");

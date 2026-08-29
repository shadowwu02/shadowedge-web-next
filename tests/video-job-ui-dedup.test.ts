import { describe, expect, it } from "vitest";

import { buildVideoGenerationRecords } from "@/components/video/VideoGenerationStream";
import {
  getVideoGenerationJobId,
  getVideoHistoryStatusCounts,
  isSameVideoGenerationJob,
  mergeVideoHistory,
  upsertVideoHistoryRecord,
} from "@/lib/video/historyUtils";
import type { VideoTaskRecord } from "@/types/video";

const DB_JOB_ID = "c1be9ef6-bcd5-4cc6-a9f7-e2e4c0120577";
const PROVIDER_JOB_ID = "xinhankr:video-task-20260822";
const TEST_NOW = Date.now();
const timestamp = (offsetMs = 0) => new Date(TEST_NOW + offsetMs).toISOString();

function task(overrides: Partial<VideoTaskRecord> = {}): VideoTaskRecord {
  return {
    jobId: PROVIDER_JOB_ID,
    providerJobId: PROVIDER_JOB_ID,
    dbJobId: DB_JOB_ID,
    status: "processing",
    createdAt: timestamp(),
    updatedAt: timestamp(),
    ...overrides,
  };
}

describe("video workspace job identity dedup", () => {
  it("uses the canonical generation job id instead of provider tracking", () => {
    expect(getVideoGenerationJobId(task())).toBe(DB_JOB_ID);
  });

  it("replaces the pending optimistic item when polling updates the same job", () => {
    const optimistic = task({ status: "starting" });
    const polling = task({ status: "processing", updatedAt: timestamp(1_000) });

    const records = upsertVideoHistoryRecord([optimistic], polling);

    expect(records).toHaveLength(1);
    expect(records[0].status).toBe("processing");
  });

  it("merges a completed server receipt over the local optimistic record", () => {
    const local = task({ status: "processing", prompt: "local prompt" });
    const server = {
      id: DB_JOB_ID,
      jobId: PROVIDER_JOB_ID,
      status: "completed",
      outputUrl: "https://cdn.example.test/video.mp4",
      createdAt: timestamp(),
      updatedAt: timestamp(60_000),
    } as unknown as VideoTaskRecord;

    const records = mergeVideoHistory([local], [server]);

    expect(records).toHaveLength(1);
    expect(records[0].status).toBe("completed");
    expect(records[0].outputUrl).toBe("https://cdn.example.test/video.mp4");
    expect(records[0].prompt).toBe("local prompt");
  });

  it("does not count the current optimistic task twice beside its server job", () => {
    const current = task({ status: "processing" });
    const server = {
      id: DB_JOB_ID,
      provider_job_id: PROVIDER_JOB_ID,
      jobId: PROVIDER_JOB_ID,
      status: "processing",
      createdAt: timestamp(),
    } as unknown as VideoTaskRecord;

    expect(isSameVideoGenerationJob(current, server)).toBe(true);
    expect(getVideoHistoryStatusCounts([server], current)).toEqual({ active: 1, failed: 0 });
    expect(buildVideoGenerationRecords(current, [server])).toHaveLength(1);
  });

  it("uses the refreshed server terminal state over a stale local processing state", () => {
    const staleCurrent = task({ status: "processing" });
    const refreshedServer = {
      id: DB_JOB_ID,
      providerJobId: PROVIDER_JOB_ID,
      jobId: PROVIDER_JOB_ID,
      status: "completed",
      outputUrl: "https://cdn.example.test/video.mp4",
      createdAt: timestamp(),
    } as unknown as VideoTaskRecord;

    expect(getVideoHistoryStatusCounts([refreshedServer], staleCurrent)).toEqual({ active: 0, failed: 0 });
  });

  it("keeps a new retry generation visible while collapsing an idempotent replay", () => {
    const first = task({ dbJobId: "11111111-1111-4111-8111-111111111111", jobId: "provider:first", providerJobId: "provider:first" });
    const replay = task({ dbJobId: first.dbJobId, jobId: "provider:first", providerJobId: "provider:first", status: "queued" });
    const newGeneration = task({
      dbJobId: "22222222-2222-4222-8222-222222222222",
      jobId: "provider:second",
      providerJobId: "provider:second",
      prompt: first.prompt,
    });

    const afterReplay = upsertVideoHistoryRecord([first], replay);
    const afterNewGeneration = upsertVideoHistoryRecord(afterReplay, newGeneration);

    expect(afterReplay).toHaveLength(1);
    expect(afterNewGeneration).toHaveLength(2);
  });

  it("bridges history aliases when local receipt has no database id yet", () => {
    const local = task({ dbJobId: null, status: "starting" });
    const server = {
      id: DB_JOB_ID,
      provider_task_id: PROVIDER_JOB_ID,
      jobId: DB_JOB_ID,
      status: "queued",
      createdAt: timestamp(),
    } as unknown as VideoTaskRecord;

    const records = mergeVideoHistory([local], [server]);

    expect(records).toHaveLength(1);
    expect(records[0].status).toBe("queued");
  });
});

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createStudioVideoNodeRun,
  isStudioVideoNodeRunRetryable,
  prepareStudioVideoNodeRunForRefresh,
  updateStudioVideoNodeRun,
} from "@/features/studio/runtime/studioVideoNodeRun";

const root = process.cwd();

describe("Studio Video node-run idempotency", () => {
  it("creates a fresh node run and VIDEO client request ID for each new operation", () => {
    const first = createStudioVideoNodeRun({ nodeId: "node-a", projectId: "project-a" });
    const next = createStudioVideoNodeRun({ nodeId: "node-a", projectId: "project-a" });

    expect(first.nodeRunId).not.toBe(next.nodeRunId);
    expect(first.clientRequestId).toMatch(/^VIDEO_[A-Za-z0-9:_-]{8,240}$/);
    expect(next.clientRequestId).not.toBe(first.clientRequestId);
    expect(first.status).toBe("running");
  });

  it.each(["NETWORK", "PROVIDER_TIMEOUT"])("keeps the same ID for an uncertain %s retry", (errorCode) => {
    const first = createStudioVideoNodeRun({ nodeId: "node-a", projectId: "project-a" });
    const retryable = updateStudioVideoNodeRun(first, {
      status: "failed",
      outputs: { errorCode },
      error: "Connection timed out before a response was received.",
    });

    expect(retryable.status).toBe("retryable_uncertain");
    expect(isStudioVideoNodeRunRetryable(retryable)).toBe(true);
    expect(retryable.clientRequestId).toBe(first.clientRequestId);
    expect(retryable.nodeRunId).toBe(first.nodeRunId);
  });

  it("closes a definitive pre-job rejection and requires a new operation", () => {
    const first = createStudioVideoNodeRun({ nodeId: "node-a", projectId: "project-a" });
    const terminal = updateStudioVideoNodeRun(first, {
      status: "failed",
      outputs: { errorCode: "PARAMETER_ISSUE" },
      error: "The selected duration is not supported.",
    });
    const next = createStudioVideoNodeRun({ nodeId: "node-a", projectId: "project-a" });

    expect(terminal.status).toBe("failed_terminal");
    expect(isStudioVideoNodeRunRetryable(terminal)).toBe(false);
    expect(next.clientRequestId).not.toBe(first.clientRequestId);
  });

  it("persists a backend job ID and changes the operation to polling only", () => {
    const first = createStudioVideoNodeRun({ nodeId: "node-a", projectId: "project-a" });
    const polling = updateStudioVideoNodeRun(first, {
      status: "queued",
      outputs: { statusJobId: "job-123" },
    });
    const terminal = updateStudioVideoNodeRun(polling, {
      status: "failed",
      outputs: { errorCode: "PROVIDER_TASK_FAILED" },
    });

    expect(polling.backendJobId).toBe("job-123");
    expect(polling.status).toBe("polling");
    expect(isStudioVideoNodeRunRetryable(polling)).toBe(false);
    expect(terminal.status).toBe("failed_terminal");
    expect(terminal.backendJobId).toBe("job-123");
  });

  it("never automatically resubmits an interrupted refresh without a saved job ID", () => {
    const first = createStudioVideoNodeRun({ nodeId: "node-a", projectId: "project-a" });
    const interrupted = prepareStudioVideoNodeRunForRefresh(first);
    const recovered = prepareStudioVideoNodeRunForRefresh({ ...first, backendJobId: "job-123" });

    expect(interrupted.status).toBe("interrupted");
    expect(interrupted.lastErrorKind).toBe("QUEUE_INTERRUPTED");
    expect(recovered.status).toBe("polling");
  });

  it("keeps the existing serial queue and passes node-run context to the video executor", () => {
    const queue = fs.readFileSync(path.join(root, "src/features/studio/runtime/generationQueue.ts"), "utf8");
    const store = fs.readFileSync(path.join(root, "src/features/studio/store/studioStore.ts"), "utf8");
    const executor = fs.readFileSync(path.join(root, "src/features/studio/runtime/executors/videoGenerateExecutor.ts"), "utf8");

    expect(queue).toMatch(/MAX_CONCURRENT_VIDEO_GENERATIONS = 1/);
    expect(store).toMatch(/nodeRun: item\.nodeRun/);
    expect(store).toMatch(/isStudioVideoNodeRunRetryable/);
    expect(store).toMatch(/resumePollingOperation/);
    expect(store).toMatch(/void get\(\)\.startGenerationPlan\(recoveryPlan\.id\)/);
    expect(executor).toMatch(/clientRequestId: context\.nodeRun\?\.clientRequestId/);
    expect(executor).toMatch(/Boolean\(context\.nodeRun\?\.backendJobId\)/);
  });

  it("marks refreshes without a saved backend job as interrupted before the queue can run", () => {
    const plans = fs.readFileSync(path.join(root, "src/features/studio/lib/studioGenerationPlans.ts"), "utf8");

    expect(plans).toMatch(/item\.nodeRun\?\.backendJobId/);
    expect(plans).toMatch(/QUEUE_INTERRUPTED/);
    expect(plans).toMatch(/hasPollingRecovery/);
    expect(plans).toMatch(/Studio will not resubmit automatically/);
  });

  it("does not put active node-run state on Canvas nodes, duplicates, templates, or Remake handoff", () => {
    const store = fs.readFileSync(path.join(root, "src/features/studio/store/studioStore.ts"), "utf8");
    const templates = fs.readFileSync(path.join(root, "src/features/studio/lib/studioTemplates.ts"), "utf8");

    expect(store).toMatch(/createVideoNodeFromRemakeShot/);
    expect(store).toMatch(/nodeRun: item\.nodeRun/);
    expect(templates).not.toMatch(/clientRequestId|nodeRunId|backendJobId/);
  });
});

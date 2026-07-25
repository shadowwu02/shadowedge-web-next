import { describe, expect, it } from "vitest";
import type {
  StudioAIPlannedCanvasDraft,
  StudioCanvasPlanStatus,
} from "@/features/studio/capabilities/studioCreativeCanvasPlanning";
import { pollStudioCreativeCanvasPlan } from "@/lib/studio-creative-canvas-planning-api";

const projectId = "project-1";

function plannedDraft(): StudioAIPlannedCanvasDraft {
  return {
    draftId: "draft-1",
    requestId: "request-1",
    planningRequest: {
      requestId: "request-1",
      projectId,
      intent: "CREATE_VIDEO",
      goal: "Create a launch film",
      constraints: {},
      references: [],
      createdAt: "2026-07-25T20:00:00.000Z",
    },
    graph: {
      graphId: "draft-graph-1",
      projectId,
      schemaVersion: "creative-canvas/v2-draft",
      nodes: [],
      edges: [],
      createdAt: "2026-07-25T20:00:00.000Z",
      mode: "DRAFT",
    },
    reasoning: [],
    evidence: [{
      evidenceId: "evidence-1",
      type: "USER_PROMPT",
      referenceId: "planning-request",
      summary: "Create a launch film",
      confidence: "HIGH",
    }],
    confidence: "HIGH",
    changes: [],
    diff: {
      addedNodes: [],
      removedNodes: [],
      movedNodes: [],
      changedEdges: { added: [], removed: [] },
      configChanges: [],
      summary: { addedNodes: 1, removedNodes: 0, movedNodes: 0, changedEdges: 1, configChanges: 0 },
    },
    validation: { status: "READY", checks: [], validatedAt: "2026-07-25T20:00:00.000Z" },
    editSession: { sessionId: "edit-1" } as StudioAIPlannedCanvasDraft["editSession"],
    actionCenter: {
      actionType: "CANVAS_AUTO_PLAN_DRAFT",
      status: "PREVIEWED",
      previewRequired: true,
      humanConfirmRequired: true,
      confirmationTarget: "CREATIVE_CANVAS_EDIT_SESSION",
    },
    createdAt: "2026-07-25T20:00:00.000Z",
    boundary: "AI_PLAN_DRAFT_ONLY_NO_PRODUCTION_GRAPH_MUTATION_NO_EXECUTION",
  };
}

function status(
  value: StudioCanvasPlanStatus["status"],
  draft: StudioAIPlannedCanvasDraft | null = null,
): StudioCanvasPlanStatus {
  return {
    draftId: "draft-1",
    requestId: "request-1",
    projectId,
    status: value,
    createdAt: "2026-07-25T20:00:00.000Z",
    updatedAt: "2026-07-25T20:00:01.000Z",
    draft,
    error: value === "FAILED" ? { code: "FAILED", message: "Planning failed." } : null,
  };
}

describe("Creative Canvas Planning polling", () => {
  it("advances BUILDING to COMPLETED and returns the Preview with Evidence and Diff", async () => {
    const states = [status("CREATED"), status("BUILDING"), status("COMPLETED", plannedDraft())];
    const value = await pollStudioCreativeCanvasPlan(
      async () => states.shift() || status("COMPLETED", plannedDraft()),
      { pollIntervalMs: 0, wait: async () => undefined },
    );

    expect(value.actionCenter.status).toBe("PREVIEWED");
    expect(value.evidence).toHaveLength(1);
    expect(value.diff.summary.addedNodes).toBe(1);
  });

  it("retries transient status errors without leaving the UI in an infinite building state", async () => {
    let calls = 0;
    const value = await pollStudioCreativeCanvasPlan(async () => {
      calls += 1;
      if (calls === 1) throw new Error("temporary network error");
      return status("COMPLETED", plannedDraft());
    }, { pollIntervalMs: 0, maxTransientErrors: 1, wait: async () => undefined });

    expect(calls).toBe(2);
    expect(value.draftId).toBe("draft-1");
  });

  it("stops with a retryable timeout instead of polling forever", async () => {
    await expect(pollStudioCreativeCanvasPlan(
      async () => status("BUILDING"),
      { maxAttempts: 2, pollIntervalMs: 0, wait: async () => undefined },
    )).rejects.toThrow("timed out before Preview was ready");
  });

  it("surfaces a terminal planning failure instead of continuing to poll", async () => {
    await expect(pollStudioCreativeCanvasPlan(
      async () => status("FAILED"),
      { pollIntervalMs: 0, wait: async () => undefined },
    )).rejects.toThrow("Planning failed.");
  });
});

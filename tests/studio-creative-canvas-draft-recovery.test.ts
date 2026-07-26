import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAuthSession } from "@/lib/auth";
import {
  STUDIO_CREATIVE_CANVAS_ACTIVE_DRAFTS_STORAGE_KEY,
  clearActiveStudioCreativeCanvasDraft,
  getActiveStudioCreativeCanvasDraft,
  saveActiveStudioCreativeCanvasDraft,
  type StudioCreativeCanvasActiveDraft,
} from "@/lib/studio-creative-canvas-draft-recovery";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

const activeDraft: StudioCreativeCanvasActiveDraft = {
  draftId: "plan-draft-1",
  projectId: "project-1",
  graphVersion: "creative-canvas/v1:project-1",
  status: "REVIEW",
  createdAt: "2026-07-26T12:00:00.000Z",
  draftType: "AI_PLAN",
  editSessionId: "edit-session-1",
};

beforeEach(() => {
  vi.stubGlobal("window", {
    localStorage: new MemoryStorage(),
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal("CustomEvent", class CustomEvent {
    constructor(public type: string) {}
  });
});

describe("Creative Canvas active Draft recovery", () => {
  it("persists the active Draft pointer for refresh and a new tab", () => {
    expect(saveActiveStudioCreativeCanvasDraft(activeDraft)).toBe(true);
    expect(getActiveStudioCreativeCanvasDraft("project-1")).toEqual(activeDraft);
    const stored = window.localStorage.getItem(STUDIO_CREATIVE_CANVAS_ACTIVE_DRAFTS_STORAGE_KEY) || "";
    expect(stored).toContain("plan-draft-1");
    expect(stored).not.toContain("evidence");
    expect(stored).not.toContain("nodes");
  });

  it("isolates active Drafts by project", () => {
    saveActiveStudioCreativeCanvasDraft(activeDraft);
    saveActiveStudioCreativeCanvasDraft({
      ...activeDraft,
      draftId: "optimization-2",
      projectId: "project-2",
      draftType: "AI_OPTIMIZATION",
      editSessionId: "edit-session-2",
    });

    expect(getActiveStudioCreativeCanvasDraft("project-1")?.draftId).toBe("plan-draft-1");
    expect(getActiveStudioCreativeCanvasDraft("project-2")?.draftId).toBe("optimization-2");
  });

  it.each(["DRAFT", "REVIEW", "CONFIRMED", "REJECTED", "EXPIRED"] as const)(
    "restores the %s lifecycle state",
    (status) => {
      saveActiveStudioCreativeCanvasDraft({ ...activeDraft, status });
      expect(getActiveStudioCreativeCanvasDraft("project-1")?.status).toBe(status);
    },
  );

  it("survives logout so the owned Draft can be revalidated after login", () => {
    saveActiveStudioCreativeCanvasDraft(activeDraft);
    clearAuthSession();
    expect(getActiveStudioCreativeCanvasDraft("project-1")).toEqual(activeDraft);
  });

  it("clears only the selected project Draft", () => {
    saveActiveStudioCreativeCanvasDraft(activeDraft);
    saveActiveStudioCreativeCanvasDraft({
      ...activeDraft,
      draftId: "edit-2",
      projectId: "project-2",
      draftType: "EDIT_SESSION",
      editSessionId: "edit-2",
    });
    expect(clearActiveStudioCreativeCanvasDraft("project-1")).toBe(true);
    expect(getActiveStudioCreativeCanvasDraft("project-1")).toBeNull();
    expect(getActiveStudioCreativeCanvasDraft("project-2")?.draftId).toBe("edit-2");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  canConfirmRemakeExport,
  createRemakeExportFlowState,
  reduceRemakeExportFlow,
  type RemakeExportPreview,
  type RemakeExportRenderProjection,
} from "@/lib/video/remakeExportProductFlow";

const componentSource = readFileSync(
  new URL("../src/components/video/remake/RemakeExportFlowPanel.tsx", import.meta.url),
  "utf8",
);
const timelineSource = readFileSync(
  new URL("../src/components/video/remake/RemakeStoryboardTimeline.tsx", import.meta.url),
  "utf8",
);
const panelSource = readFileSync(
  new URL("../src/components/video/remake/RemakeStoryboardPanel.tsx", import.meta.url),
  "utf8",
);
const dictionarySource = readFileSync(
  new URL("../src/i18n/dictionary.ts", import.meta.url),
  "utf8",
);

function preview(sufficient = true): RemakeExportPreview {
  return {
    snapshot: { shotCount: 7, durationSeconds: 14 },
    estimate: { credits: 63, currency: "credits", status: "ESTIMATE_ONLY" },
    creditPreview: { balance: sufficient ? 120 : 10, sufficient, mutation: "NONE" },
    explicitConfirmationRequired: true,
  };
}

function render(
  status: RemakeExportRenderProjection["status"],
  overrides: Partial<RemakeExportRenderProjection> = {},
): RemakeExportRenderProjection {
  const completed = status === "completed";
  return {
    renderJobRef: "render-job-public-ref",
    status,
    progress: status === "queued" ? 0 : status === "processing" ? 48 : 100,
    failureCategory: status === "failed" ? "RENDER_COMPOSITE_FAILED" : null,
    download: completed
      ? {
          available: true,
          mimeType: "video/mp4",
          href: "/api/remake/render-jobs/render-job-public-ref/download",
        }
      : { available: false, mimeType: null, href: null },
    ...overrides,
  };
}

function awaitingConfirmation(sufficient = true) {
  const previewing = reduceRemakeExportFlow(createRemakeExportFlowState(), { type: "REQUEST_PREVIEW" });
  return reduceRemakeExportFlow(previewing, { type: "PREVIEW_RECEIVED", preview: preview(sufficient) });
}

describe("Remake R8 Export Product Flow", () => {
  it("requires preview and explicit confirmation before one queued Render projection", () => {
    const awaiting = awaitingConfirmation();
    expect(awaiting.phase).toBe("awaiting_confirmation");
    expect(canConfirmRemakeExport(awaiting)).toBe(true);
    const confirming = reduceRemakeExportFlow(awaiting, { type: "CONFIRM" });
    expect(confirming.phase).toBe("confirming");
    const queued = reduceRemakeExportFlow(confirming, { type: "RENDER_RECEIVED", render: render("queued") });
    expect(queued.phase).toBe("queued");
  });

  it("cancels before Render without retaining a pending confirmation", () => {
    const cancelled = reduceRemakeExportFlow(awaitingConfirmation(), { type: "CANCEL" });
    expect(cancelled).toEqual({ phase: "idle" });
  });

  it("blocks confirmation when the Backend Credit preview is insufficient", () => {
    const awaiting = awaitingConfirmation(false);
    expect(canConfirmRemakeExport(awaiting)).toBe(false);
    expect(() => reduceRemakeExportFlow(awaiting, { type: "CONFIRM" })).toThrowError(
      expect.objectContaining({ code: "REMAKE_EXPORT_INSUFFICIENT_CREDITS" }),
    );
  });

  it("deduplicates polling by preserving one Render identity", () => {
    const confirming = reduceRemakeExportFlow(awaitingConfirmation(), { type: "CONFIRM" });
    const queued = reduceRemakeExportFlow(confirming, { type: "RENDER_RECEIVED", render: render("queued") });
    const queuedReplay = reduceRemakeExportFlow(queued, { type: "RENDER_RECEIVED", render: render("queued") });
    const processing = reduceRemakeExportFlow(queuedReplay, {
      type: "RENDER_RECEIVED",
      render: render("processing"),
    });
    expect(processing.phase).toBe("processing");
    expect("render" in processing && processing.render.renderJobRef).toBe("render-job-public-ref");
    expect(() => reduceRemakeExportFlow(processing, {
      type: "RENDER_RECEIVED",
      render: render("processing", { renderJobRef: "another-job" }),
    })).toThrowError(expect.objectContaining({ code: "REMAKE_EXPORT_RENDER_IDENTITY_CONFLICT" }));
  });

  it("accepts completed canonical download and keeps completion terminal", () => {
    const confirming = reduceRemakeExportFlow(awaitingConfirmation(), { type: "CONFIRM" });
    const completed = reduceRemakeExportFlow(confirming, {
      type: "RENDER_RECEIVED",
      render: render("completed"),
    });
    expect(completed.phase).toBe("completed");
    expect("render" in completed && completed.render.download.available).toBe(true);
    expect(() => reduceRemakeExportFlow(completed, {
      type: "RENDER_RECEIVED",
      render: render("processing"),
    })).toThrowError(expect.objectContaining({ code: "REMAKE_EXPORT_TERMINAL_STATE_CONFLICT" }));
  });

  it("rejects external or premature download links", () => {
    const confirming = reduceRemakeExportFlow(awaitingConfirmation(), { type: "CONFIRM" });
    expect(() => reduceRemakeExportFlow(confirming, {
      type: "RENDER_RECEIVED",
      render: render("completed", { download: { available: true, mimeType: "video/mp4", href: "https://storage.example/output.mp4" } }),
    })).toThrowError(expect.objectContaining({ code: "REMAKE_EXPORT_DOWNLOAD_INVALID" }));
    expect(() => reduceRemakeExportFlow(confirming, {
      type: "RENDER_RECEIVED",
      render: render("processing", { download: { available: true, mimeType: "video/mp4", href: "/api/remake/render-jobs/render-job-public-ref/download" } }),
    })).toThrowError(expect.objectContaining({ code: "REMAKE_EXPORT_DOWNLOAD_NOT_READY" }));
  });

  it("renders failed state without a download or automatic retry", () => {
    const confirming = reduceRemakeExportFlow(awaitingConfirmation(), { type: "CONFIRM" });
    const failed = reduceRemakeExportFlow(confirming, { type: "RENDER_RECEIVED", render: render("failed") });
    expect(failed.phase).toBe("failed");
    expect("render" in failed && failed.render.download.available).toBe(false);
    expect(componentSource).toContain("video.remake.export.statusHelp.${render.status}");
    expect(dictionarySource).toContain("No automatic retry or replacement export was started.");
    expect(componentSource).not.toMatch(/setInterval|useEffect|autoRetry|retryExport/i);
  });

  it("provides confirmation, progress and download UI without production enablement", () => {
    expect(componentSource).toContain('data-testid="remake-export-confirmation"');
    expect(componentSource).toContain("disabled={!canConfirmRemakeExport(state)");
    expect(componentSource).toContain('data-testid="remake-export-status"');
    expect(componentSource).toContain("render.download.available");
    expect(componentSource).toContain("download");
    expect(componentSource).not.toMatch(/fetch\(|credit.*mutat|billing|stripe|provider/i);
    expect(timelineSource).toContain("exportFlow?: RemakeExportFlowPanelProps");
    expect(timelineSource).toContain("exportFlow ? <RemakeExportFlowPanel");
    expect(panelSource).not.toContain("exportFlow=");
  });
});

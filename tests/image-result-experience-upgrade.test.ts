import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { downloadBrowserFile } from "../src/lib/browserDownload";
import {
  isSameImageGenerationJob,
  mergeImageHistory,
  normalizeImageHistoryItem,
  upsertImageHistoryRecord,
} from "../src/lib/image/imageHistoryUtils";

const resultStackSource = readFileSync(new URL("../src/components/image/ImageResultStack.tsx", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("../src/components/image/ImageWorkspace.tsx", import.meta.url), "utf8");
const historySource = readFileSync(new URL("../src/components/image/ImageHistoryPanel.tsx", import.meta.url), "utf8");
const detailSource = readFileSync(new URL("../src/components/image/ImageOutputDetailPanel.tsx", import.meta.url), "utf8");

function imageRecord(input: Record<string, unknown>) {
  return normalizeImageHistoryItem({
    batchCount: 1,
    createdAt: 1,
    model: "gpt-image-2",
    prompt: "A safe test image",
    ratio: "1:1",
    resolution: "1K",
    ...input,
  });
}

describe("Image Workspace result experience", () => {
  it("replaces a local pending record with the matching server job after receipt/history merge", () => {
    const local = imageRecord({
      dbJobId: "11111111-1111-4111-8111-111111111111",
      jobId: "provider-job-1",
      source: "local",
      status: "queued",
      updatedAt: 10,
    });
    const server = imageRecord({
      id: "11111111-1111-4111-8111-111111111111",
      jobId: "11111111-1111-4111-8111-111111111111",
      prompt: "Server-authoritative prompt",
      status: "processing",
      updatedAt: 20,
    });

    expect(isSameImageGenerationJob(local, server)).toBe(true);
    const merged = mergeImageHistory([server], [local]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      prompt: "Server-authoritative prompt",
      source: "server",
      status: "processing",
    });
  });

  it("upserts polling transitions without appending duplicate cards", () => {
    const queued = imageRecord({ dbJobId: "22222222-2222-4222-8222-222222222222", jobId: "provider-job-2", source: "local", status: "queued", updatedAt: 10 });
    const processing = imageRecord({ dbJobId: "22222222-2222-4222-8222-222222222222", jobId: "provider-job-2", source: "local", status: "processing", updatedAt: 20 });
    const completed = imageRecord({ dbJobId: "22222222-2222-4222-8222-222222222222", jobId: "provider-job-2", outputUrls: ["https://assets.example/result.png"], source: "local", status: "completed", updatedAt: 30 });

    const records = upsertImageHistoryRecord(upsertImageHistoryRecord([queued], processing), completed);
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe("completed");
    expect(records[0].outputUrls).toEqual(["https://assets.example/result.png"]);
  });

  it("keeps distinct retry/history identities as distinct results", () => {
    const first = imageRecord({ dbJobId: "33333333-3333-4333-8333-333333333333", status: "failed", updatedAt: 10 });
    const retry = imageRecord({ dbJobId: "44444444-4444-4444-8444-444444444444", status: "queued", updatedAt: 20 });
    expect(mergeImageHistory([first, retry])).toHaveLength(2);
  });

  it("downloads through a fetched Blob instead of navigating to the remote image", async () => {
    let appended = false;
    let clicked = false;
    let removed = false;
    let revoked = "";
    const anchor = {
      click: () => { clicked = true; },
      download: "",
      href: "",
      rel: "",
      remove: () => { removed = true; },
      style: { display: "" },
    } as unknown as HTMLAnchorElement;
    const documentObject = {
      body: { appendChild: () => { appended = true; } },
      createElement: () => anchor,
    } as unknown as Document;
    const fetcher = vi.fn(async () => new Response(new Blob(["image"]), { status: 200 }));
    const urlApi = {
      createObjectURL: () => "blob:download-result",
      revokeObjectURL: (value: string) => { revoked = value; },
    };

    await downloadBrowserFile({
      documentObject,
      fetcher,
      filename: "result.png",
      url: "https://assets.example/result.png",
      urlApi,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetcher).toHaveBeenCalledWith("https://assets.example/result.png", { credentials: "omit", method: "GET" });
    expect(anchor.download).toBe("result.png");
    expect(anchor.href).toBe("blob:download-result");
    expect({ appended, clicked, removed, revoked }).toEqual({ appended: true, clicked: true, removed: true, revoked: "blob:download-result" });
  });

  it("renders a stacked status lifecycle with direct download, detail, and owned canonical reference reuse", () => {
    expect(workspaceSource).toContain("<ImageResultStack");
    expect(workspaceSource).toContain("jobs={image.history}");
    expect(resultStackSource).toContain('t("image.status.queued")');
    expect(resultStackSource).toContain('t("image.status.processing")');
    expect(resultStackSource).toContain('t("image.status.completed")');
    expect(resultStackSource).toContain('t("image.status.failed")');
    expect(resultStackSource).toContain("downloadBrowserFile");
    expect(resultStackSource).toContain("onReuseReference");
    expect(resultStackSource).toContain("onSelect(job)");
    expect(workspaceSource).toContain("saveAssetFromJob");
    expect(workspaceSource).toContain("mediaAssetToImageReferenceItem");
    expect(workspaceSource).toContain("image.addReferenceItems([reference])");
  });

  it("uses direct download behavior in stack, compact history, and detail views", () => {
    for (const source of [resultStackSource, historySource, detailSource]) {
      expect(source).toContain("downloadBrowserFile");
      expect(source).not.toMatch(/<a[^>]+download=/);
    }
  });
});

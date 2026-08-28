import { afterEach, describe, expect, it } from "vitest";
import {
  IMAGE_WORKSPACE_DRAFT_KEY,
  IMAGE_WORKSPACE_DRAFT_VERSION,
  readImageWorkspaceDraft,
  saveImageWorkspaceDraft,
} from "@/lib/image/imageWorkspaceDraft";

const originalWindow = globalThis.window;

function installStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set(IMAGE_WORKSPACE_DRAFT_KEY, initial);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    },
    writable: true,
  });
  return values;
}

afterEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow, writable: true });
});

describe("Image draft v2 capability persistence", () => {
  it("persists canonical aspectRatio and quantity", () => {
    const values = installStorage();
    const saved = saveImageWorkspaceDraft({
      prompt: "A safe scene",
      modelId: "gpt_image_2",
      params: { aspectRatio: "16:9", ratio: "16:9", resolution: "4K", quality: "medium", batchCount: 1 },
      references: [],
    });
    expect(saved.ok).toBe(true);
    const raw = JSON.parse(values.get(IMAGE_WORKSPACE_DRAFT_KEY) || "{}");
    expect(raw).toMatchObject({ version: IMAGE_WORKSPACE_DRAFT_VERSION, aspectRatio: "16:9", quantity: 1 });
  });

  it("migrates a fresh legacy v1 ratio without guessing a different value", () => {
    installStorage(JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      prompt: "",
      modelId: "gpt_image_2",
      ratio: "1:1",
      resolution: "1K",
      quality: "medium",
      batchCount: 1,
      references: [],
    }));
    const result = readImageWorkspaceDraft();
    expect(result.status).toBe("ok");
    expect(result.draft).toMatchObject({ version: 2, aspectRatio: "1:1", ratio: "1:1", quantity: 1 });
  });
});

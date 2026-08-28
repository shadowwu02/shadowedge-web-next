import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createImageHydrationDiagnostic,
  emitImageHydrationDiagnostic,
} from "@/lib/image/imageHydrationDiagnostic";

const workspaceSource = readFileSync(new URL("../src/components/image/ImageWorkspace.tsx", import.meta.url), "utf8");
const panelSource = readFileSync(new URL("../src/components/image/ImagePromptPanel.tsx", import.meta.url), "utf8");
const originalWindow = globalThis.window;

afterEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow, writable: true });
});

describe("privacy-safe Image hydration diagnostics", () => {
  it("creates a deterministic allowlisted snapshot with no sensitive fields", () => {
    const input = {
      buildSha: "f3e045eedd615227aa4ba9b2b3ddb746f37ecbf7",
      route: "/workspace/image" as const,
      language: "zh" as const,
      modelStateCategory: "catalog_ready" as const,
      catalogLoaded: true,
      draftReady: true,
      referenceCount: 1,
      resolution: "4K",
      derivedAspectRatio: "16:9",
      authStateCategory: "authenticated" as const,
      prompt: "must never be accepted",
      token: "must never be accepted",
      customerId: "must never be accepted",
    };
    const first = createImageHydrationDiagnostic(input);
    const second = createImageHydrationDiagnostic(input);
    expect(first).toEqual(second);
    expect(first.fingerprint).toMatch(/^ihs_[a-f0-9]{8}$/);
    expect(Object.keys(first)).toEqual([
      "buildSha", "route", "language", "modelStateCategory", "catalogLoaded",
      "draftReady", "referenceCount", "resolution", "derivedAspectRatio",
      "authStateCategory", "fingerprint",
    ]);
    expect(JSON.stringify(first)).not.toMatch(/prompt|token|customerId|cookie|url/i);
  });

  it("emits a safe internal event and does not patch or mask React errors", () => {
    const dispatchEvent = vi.fn();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { dispatchEvent },
      writable: true,
    });
    const diagnostic = createImageHydrationDiagnostic({ language: "en" });
    emitImageHydrationDiagnostic(diagnostic.fingerprint, diagnostic);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(workspaceSource).toContain("data-image-hydration-fingerprint");
    expect(workspaceSource).toContain("emitImageHydrationDiagnostic");
    expect(workspaceSource).not.toContain("suppressHydrationWarning");
    expect(workspaceSource).not.toContain("console.error =");
    expect(panelSource).not.toContain("suppressHydrationWarning");
  });
});

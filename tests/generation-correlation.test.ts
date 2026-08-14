import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../src/lib/api";

describe("generation request correlation", () => {
  it("adds a safe correlation ID to API requests", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("X-Correlation-Id")).toMatch(/^[a-zA-Z0-9._:-]+$/);
      return new Response(JSON.stringify({ ok: true, data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      await apiRequest("/api/image/models", { method: "GET", token: "" });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("forwards correlation through the Short Remake server proxy", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/internal/video/reverse-analyze/route.ts"),
      "utf8",
    );
    expect(source).toContain('"X-Correlation-Id": correlationId');
    expect(source).toContain('response.headers.get("x-correlation-id") || correlationId');
    expect(source).not.toContain("NEXT_PUBLIC_INTERNAL_VIDEO_SITE_KEY");
  });
});

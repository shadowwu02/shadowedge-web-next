import { describe, expect, it } from "vitest";
import { createVideoClientRequestId, normalizeVideoClientRequestId } from "@/lib/video/videoClientRequestId";

describe("video client request IDs", () => {
  it("creates an ArtsDance-safe ID", () => {
    expect(createVideoClientRequestId()).toMatch(/^VIDEO_[A-Za-z0-9:_-]{8,240}$/);
  });

  it("rejects missing and unsafe caller IDs", () => {
    expect(normalizeVideoClientRequestId("")).toBe("");
    expect(normalizeVideoClientRequestId("bad id")).toBe("");
    expect(normalizeVideoClientRequestId("VIDEO_12345678")).toBe("VIDEO_12345678");
  });
});

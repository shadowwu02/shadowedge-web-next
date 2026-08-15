import { afterEach, describe, expect, it, vi } from "vitest";
import { generateImage } from "@/lib/image-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each(["gpt_image_2", "nano_banana", "nano_banana_lite"])("%s browser request contract", (model) => {
  it("uses the shared image endpoint with idempotency and correlation headers", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(url).toBe("https://api.shadowedgeai.com/api/image/generate");
      expect(headers.get("Idempotency-Key")).toBe(`idempotency-${model}`);
      expect(headers.get("X-Correlation-Id")).toMatch(/^[a-zA-Z0-9._:-]+$/);
      return new Response(JSON.stringify({
        ok: true,
        data: {
          jobId: `job-${model}`,
          status: "queued",
          model,
          params: { ratio: "1:1", resolution: "1K", quality: "low", batchCount: 1 },
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await generateImage({
      prompt: "A ceramic cup",
      model,
      idempotencyKey: `idempotency-${model}`,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

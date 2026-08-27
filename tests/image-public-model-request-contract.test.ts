import { afterEach, describe, expect, it, vi } from "vitest";
import { generateImage } from "@/lib/image-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each(["gpt_image_2", "nano_banana", "nano_banana_lite"])("%s browser request contract", (model) => {
  it("uses the shared image endpoint with idempotency and correlation headers", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      const body = JSON.parse(String(init?.body || "{}"));
      expect(url).toBe("https://api.shadowedgeai.com/api/image/generate");
      expect(headers.get("Idempotency-Key")).toBe(`idempotency-${model}`);
      expect(body.idempotencyKey).toBe(`idempotency-${model}`);
      expect(body.clientRequestId).toBe(`idempotency-${model}`);
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

  it("generates one canonical identity and projects that exact value into header and body", async () => {
    const generated = `generated-${model}-request`;
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => generated) });
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      const body = JSON.parse(String(init?.body || "{}"));
      expect(headers.get("Idempotency-Key")).toBe(generated);
      expect(body.idempotencyKey).toBe(generated);
      expect(body.clientRequestId).toBe(generated);
      return new Response(JSON.stringify({
        ok: true,
        data: { jobId: `job-${model}`, status: "queued", model, params: {} },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    await generateImage({ prompt: "A ceramic cup", model });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("accepts the durable 202 response and exposes its Job ID for polling", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      data: { jobId: `accepted-${model}`, dbJobId: `accepted-${model}`, status: "processing", model, asyncRuntime: "image_submit_outbox", outboxId: `outbox-${model}`, params: {} },
    }), { status: 202, headers: { "Content-Type": "application/json" } })));
    await expect(generateImage({ prompt: "A ceramic cup", model, idempotencyKey: `accepted-${model}` })).resolves.toMatchObject({
      jobId: `accepted-${model}`, status: "processing", outboxId: `outbox-${model}`,
    });
  });
});

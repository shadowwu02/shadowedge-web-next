import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const apiSource = readFileSync(new URL("../src/lib/video-api.ts", import.meta.url), "utf8");
const hookSource = readFileSync(new URL("../src/hooks/useLongVideoRemakeAnalysis.ts", import.meta.url), "utf8");

describe("Long Video durable quote binding", () => {
  it("binds estimate and create to the same client request and fingerprint", () => {
    expect(apiSource).toMatch(/clientRequestId:\s*input\.clientRequestId/);
    expect(apiSource).toMatch(/requestFingerprint:\s*input\.requestFingerprint/);
    expect(apiSource).toMatch(/estimate\.requestFingerprint/);
    expect(hookSource).toMatch(/clientRequestId:\s*nextClientRequestId/);
    expect(hookSource).toMatch(/!estimate\.estimateId\s*\|\|\s*!estimate\.requestFingerprint/);
    expect(hookSource).toMatch(/requestFingerprint:\s*pendingEstimate\.safeEstimate\.requestFingerprint/);
  });
});

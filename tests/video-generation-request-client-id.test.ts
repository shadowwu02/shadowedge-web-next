import { describe, expect, it } from "vitest";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";

const aliases = ["seedance_2_0_mini", "seedance_2_0_fast", "seedance_2_0", "seedance_2_5"] as const;

describe("normal Seedance requests", () => {
  for (const id of aliases) {
    it(`${id} carries the operation clientRequestId to the transport payload`, () => {
      const request = buildVideoGenerationRequest({
        prompt: "safe test prompt",
        model: { id, label: id, provider: "xinhankr", providerModel: "provider-model", credits: 23, durations: [5], durationDefault: 5, ratios: ["16:9"], qualities: ["720p"] },
        duration: 5,
        ratio: "16:9",
        quality: "720p",
        generateAudio: false,
        media: [],
        clientRequestId: "VIDEO_test_operation_12345678",
      });
      expect(request.clientRequestId).toBe("VIDEO_test_operation_12345678");
      expect(request.client_request_id).toBe(request.clientRequestId);
      expect(request.meta.clientRequestId).toBe(request.clientRequestId);
    });
  }
});

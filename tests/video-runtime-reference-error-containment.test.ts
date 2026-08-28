import { describe, expect, it } from "vitest";

import { getSafeVideoGenerationErrorMessage } from "@/hooks/useVideoGeneration";

describe("video runtime reference error containment", () => {
  it("does not expose an internal catalog admission ReferenceError", () => {
    const internalName = ["video", "Catalog", "Admission"].join("");
    expect(getSafeVideoGenerationErrorMessage(
      new ReferenceError(`${internalName} is not defined`),
      "Video generation request failed.",
    )).toBe("Video generation request failed.");
  });

  it("preserves actionable validation messages", () => {
    expect(getSafeVideoGenerationErrorMessage(
      new Error("Please enter a prompt first."),
      "Video generation request failed.",
    )).toBe("Please enter a prompt first.");
  });
});

import { describe, expect, it } from "vitest";
import { normalizeImageModel } from "@/lib/image/imageModelRules";
import { normalizeVideoModel } from "@/lib/video-api";

describe("Higgsfield model runtime availability", () => {
  it("preserves the fail-closed Image catalog state", () => {
    const model = normalizeImageModel({
      id: "legacy_higgsfield_image",
      provider: "higgsfield",
      available: false,
      availability: "maintenance",
      maintenanceMessage: "maintenance",
      capabilities: {},
    });
    expect(model.available).toBe(false);
    expect(model.availability).toBe("maintenance");
  });

  it("preserves the fail-closed Video catalog state", () => {
    const model = normalizeVideoModel({
      id: "legacy_higgsfield_video",
      provider: "higgsfield",
      available: false,
      availability: "maintenance",
      maintenanceMessage: "maintenance",
    });
    expect(model.available).toBe(false);
    expect(model.availability).toBe("maintenance");
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeImageModel } from "@/lib/image/imageModelRules";
import { normalizeVideoModel } from "@/lib/video-api";
import { normalizeImageHistoryItem } from "@/lib/image/imageHistoryUtils";
import { normalizeVideoHistoryItem } from "@/lib/video-api";
import {
  HIGGSFIELD_PRODUCTION_RETIRED,
  filterRetiredHiggsfieldModels,
  isRetiredHiggsfieldImageAlias,
  isRetiredHiggsfieldModel,
  isRetiredHiggsfieldVideoAlias,
} from "@/lib/higgsfieldProductionRetirement";
import { getDefaultImageModel } from "@/lib/image/imageModelRules";

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

  it("permanently hides every CLI-backed public alias without hiding verified replacements", () => {
    expect(HIGGSFIELD_PRODUCTION_RETIRED).toBe(true);
    expect(isRetiredHiggsfieldImageAlias("image_auto")).toBe(true);
    expect(isRetiredHiggsfieldImageAlias("Nano Banana 2")).toBe(true);
    expect(isRetiredHiggsfieldVideoAlias("Veo 3.1")).toBe(true);
    expect(isRetiredHiggsfieldVideoAlias("wan2_7")).toBe(true);
    expect(isRetiredHiggsfieldImageAlias("gpt_image_2")).toBe(false);
    expect(isRetiredHiggsfieldImageAlias("nano_banana")).toBe(false);
    expect(isRetiredHiggsfieldVideoAlias("seedance_2_0")).toBe(false);

    const filtered = filterRetiredHiggsfieldModels([
      { id: "veo3_1", provider: "shadowedge" },
      { id: "gpt_image_2", provider: "shadowedge" },
      { id: "opaque", provider: "higgsfield" },
      { id: "seedance_2_0", provider: "seedance" },
    ]);
    expect(filtered.map((model) => model.id)).toEqual(["gpt_image_2", "seedance_2_0"]);
  });

  it("keeps the empty-catalog Image fallback fail-closed and non-Higgsfield", () => {
    const fallback = getDefaultImageModel([]);
    expect(fallback.id).toBe("gpt_image_2");
    expect(fallback.provider).toBe("derouter");
    expect(fallback.available).toBe(false);
  });

  it("recognizes legacy Studio and Draft identities without rewriting them", () => {
    expect(isRetiredHiggsfieldModel({ provider: "higgsfield", modelId: "legacy-model" })).toBe(true);
    expect(isRetiredHiggsfieldModel({ provider: "shadowedge", modelId: "kling3_0" })).toBe(true);
    expect(isRetiredHiggsfieldModel({ provider: "seedance", modelId: "seedance_2_5" })).toBe(false);
  });

  it("keeps historical Higgsfield Image and Video records readable", () => {
    const image = normalizeImageHistoryItem({
      id: "old-image",
      status: "completed",
      provider: "higgsfield",
      model: "nano_banana_2",
      output_urls: ["https://assets.shadowedgeai.com/old.png"],
    });
    const video = normalizeVideoHistoryItem({
      id: "old-video",
      status: "completed",
      provider: "higgsfield",
      model: "kling3_0",
      output_urls: ["https://assets.shadowedgeai.com/old.mp4"],
    });
    expect(image.model).toBe("nano_banana_2");
    expect(image.outputUrls).toEqual(["https://assets.shadowedgeai.com/old.png"]);
    expect(video.model).toBe("kling3_0");
    expect(video.outputUrls).toEqual(["https://assets.shadowedgeai.com/old.mp4"]);
  });

  it("keeps offline Model Library fallbacks free of retired Higgsfield aliases", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/models/ModelLibraryPage.tsx"), "utf8");
    expect(source).not.toContain('id: "image_auto"');
    expect(source).not.toContain('modelId: "veo3_1"');
    expect(source).not.toContain('modelId: "kling2_6"');
    for (const alias of ["seedance_2_0_mini", "seedance_2_0_fast", "seedance_2_0", "seedance_2_5"]) {
      expect(source).toContain(`"${alias}"`);
    }
  });
});

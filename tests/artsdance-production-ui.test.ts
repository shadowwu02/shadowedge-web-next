import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getVideoModelRule } from "../src/lib/video/videoModelRules";

const models = [
  ["seedance_2_0_mini", "Seedance 2.0 Mini"],
  ["seedance_2_0_fast", "Seedance 2.0 Fast"],
  ["seedance_2_0", "Seedance 2.0"],
  ["seedance_2_5", "Seedance 2.5"],
] as const;

describe("ArtsDance Seedance production UI contract", () => {
  it.each(models)("freezes %s to the verified text-to-video capability", (alias, label) => {
    const rule = getVideoModelRule(alias);
    expect(rule.label).toBe(label);
    expect(rule.ratios).toEqual(["16:9"]);
    expect(rule.durations).toEqual([5]);
    expect(rule.qualities).toEqual(["720p"]);
    expect(rule.uploadSlots).toEqual([]);
    expect(rule.maxReferences).toEqual({ total: 0, image: 0, video: 0, audio: 0 });
    expect(rule.supportsImageReference).toBe(false);
    expect(rule.supportsVideoReference).toBe(false);
    expect(rule.supportsAudioReference).toBe(false);
  });

  it("keeps the legacy 2.5 Pro alias compatible without exposing Pro in the label", () => {
    expect(getVideoModelRule("seedance_2_5_pro").modelId).toBe("seedance_2_5");
    expect(getVideoModelRule("seedance_2_5_pro").label).toBe("Seedance 2.5");
  });

  it("uses a build-time production gate and hides reference controls for models with no upload slots", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src", "components", "video", "VideoWorkspace.tsx"),
      "utf8",
    );
    expect(source).toContain("NEXT_PUBLIC_XINHANKR_ARTSDANCE_PRODUCTION_ENABLED");
    expect(source).toContain("requiredModels");
    expect(source).toContain("legacySeedanceFallbackModels");
    expect(source).toContain("selectedModelRule.uploadSlots.length > 0");
    expect(source).not.toContain('label: "Seedance 2.5 Pro"');
  });
});

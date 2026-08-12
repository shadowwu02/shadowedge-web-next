import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getVideoModelRule } from "../src/lib/video/videoModelRules";

const models = [["seedance_2_0_mini", "Seedance 2.0 Mini"]] as const;

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

  it("uses the independent Internal Smoke build gate and keeps the public Seedance 2.0 visible", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src", "components", "video", "VideoWorkspace.tsx"),
      "utf8",
    );
    expect(source).toContain("NEXT_PUBLIC_XINHANKR_ARTSDANCE_INTERNAL_SMOKE_ENABLED");
    expect(source).toContain("getInternalSmokeVideoModels");
    expect(source).toContain('id: "seedance_2_0"');
    expect(source).not.toContain("NEXT_PUBLIC_XINHANKR_ARTSDANCE_PRODUCTION_ENABLED");
    expect(source).toContain("selectedModelRule.uploadSlots.length > 0");
  });

  it("uses the authenticated Internal Smoke models API and no public four-model fallback", () => {
    const apiSource = fs.readFileSync(path.join(process.cwd(), "src", "lib", "video-api.ts"), "utf8");
    const workspaceSource = fs.readFileSync(
      path.join(process.cwd(), "src", "components", "video", "VideoWorkspace.tsx"),
      "utf8",
    );
    expect(apiSource).toContain('"/api/video/internal-smoke/models"');
    expect(workspaceSource).not.toContain("artsdanceFallbackModels");
    expect(workspaceSource).toContain('"seedance_2_0_fast"');
    expect(workspaceSource).toContain('"seedance_2_5"');
  });
});

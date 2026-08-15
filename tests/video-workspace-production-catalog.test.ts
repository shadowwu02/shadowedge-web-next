import { describe, expect, it } from "vitest";
import type { VideoModel } from "@/types/video";
import {
  isAuthoritativeWorkspaceCatalogReady,
  selectWorkspaceProductionCatalog,
} from "@/lib/video/workspaceProductionCatalog";

function model(id: string, credits: number): VideoModel {
  return {
    id,
    label: id,
    credits,
    durationDefault: 5,
    durations: [5],
    qualities: ["720p"],
    ratios: ["16:9"],
  };
}

describe("workspace production video catalog", () => {
  it("preserves all four backend Seedance prices, including Seedance 2.5 at 23 credits", () => {
    const backendCatalog = [
      model("seedance_2_0_mini", 23),
      model("seedance_2_0_fast", 12),
      model("seedance_2_0", 23),
      model("seedance_2_5", 23),
    ];

    const catalog = selectWorkspaceProductionCatalog(backendCatalog, true);

    expect(catalog).toEqual(backendCatalog);
    expect(catalog.find((entry) => entry.id === "seedance_2_5")?.credits).toBe(23);
  });

  it("does not substitute a static executable model catalog when the authoritative catalog is empty", () => {
    const catalog = selectWorkspaceProductionCatalog([], true);

    expect(catalog).toEqual([]);
    expect(isAuthoritativeWorkspaceCatalogReady(catalog)).toBe(false);
  });

  it("continues to filter ArtsDance aliases when the production flag is disabled", () => {
    const catalog = selectWorkspaceProductionCatalog([
      model("seedance_2_5", 23),
      model("other_model", 7),
    ], false);

    expect(catalog.map((entry) => entry.id)).toEqual(["other_model"]);
  });
});

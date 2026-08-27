import { describe, expect, it } from "vitest";
import {
  applyCurrentPrivateReferencePresentation,
  isCurrentProviderBindingProjection,
  isOpaqueReferenceBindingProfileId,
  mergeSelectedReferenceMedia,
  removeReferenceMediaSelection,
  resolveCurrentReferenceProjections,
} from "@/lib/video/videoReferenceSelection";
import { getFluxProxyReviewSummary, listFluxProxyMentionTokens } from "@/lib/video/fluxproxyInternational";
import type { UploadMediaItem } from "@/types/video";

const ASSET_ID = "33333333-3333-4333-8333-333333333333";
const S25_PROFILE = "rbp_d3c7a4198e5f2b60";
const S20_PROFILE = "rbp_6f4c9a2e13d847b0";

function projection({
  id,
  profile = S25_PROFILE,
  status,
  type = "image",
  reviewAssetType = type,
  isCurrent = id.includes("current"),
}: {
  id: string;
  profile?: string;
  status: "ACTIVE" | "FAILED" | "PROCESSING";
  type?: UploadMediaItem["type"];
  reviewAssetType?: UploadMediaItem["type"];
  isCurrent?: boolean;
}): UploadMediaItem {
  return {
    id,
    assetId: ASSET_ID,
    name: "Private reference",
    type,
    url: `https://api.shadowedge.example/private-preview/${id}`,
    previewUrl: `https://api.shadowedge.example/private-preview/${id}`,
    privateReference: true,
    source: isCurrent ? "asset-library" : "local_upload_cache",
    uploadStatus: "ready",
    providerAssetReview: profile ? {
      referenceBindingProfileId: profile,
      assetType: reviewAssetType,
      status,
      isCurrent,
      authoritySource: isCurrent ? "SUPERSEDING" : "BASE",
      authorityGeneration: isCurrent ? 2 : 1,
    } : undefined,
  };
}

describe("video reference selection public binding identity lifecycle", () => {
  it("keeps the ACTIVE S25 binding across public catalog and private projection", () => {
    const historical = projection({ id: "historical", status: "FAILED" });
    const current = projection({ id: "current", status: "ACTIVE" });
    const [resolved] = resolveCurrentReferenceProjections([historical], [historical, current], S25_PROFILE);
    expect(resolved.id).toBe("current");
    expect(resolved.assetId).toBe(ASSET_ID);
    expect(resolved.providerAssetReview).toMatchObject({
      referenceBindingProfileId: S25_PROFILE,
      assetType: "image",
      status: "ACTIVE",
      isCurrent: true,
    });
    expect(getFluxProxyReviewSummary([resolved], S25_PROFILE).ready).toBe(true);
  });

  it("removes every selection-specific projection for a canonical Asset on deselect", () => {
    const historical = projection({ id: "historical", status: "FAILED" });
    const current = projection({ id: "current", status: "ACTIVE" });
    expect(removeReferenceMediaSelection([historical, current], "current")).toEqual([]);
  });

  it("keeps initial select and two reselect cycles ACTIVE without duplicate chips or mentions", () => {
    const current = projection({ id: "current", status: "ACTIVE" });
    const initial = mergeSelectedReferenceMedia([], [current]);
    const firstReselect = mergeSelectedReferenceMedia(removeReferenceMediaSelection(initial, current.id), [current]);
    const secondReselect = mergeSelectedReferenceMedia(removeReferenceMediaSelection(firstReselect, current.id), [current]);
    for (const selection of [initial, firstReselect, secondReselect]) {
      expect(selection).toHaveLength(1);
      expect(selection[0]?.providerAssetReview?.status).toBe("ACTIVE");
      expect(listFluxProxyMentionTokens(selection)).toEqual(["@图1"]);
    }
  });

  it("deduplicates historical and current snapshots of the same canonical Asset", () => {
    const historical = projection({ id: "historical", status: "FAILED" });
    const current = projection({ id: "current", status: "ACTIVE" });
    const resolved = resolveCurrentReferenceProjections([historical, current], [historical, current], S25_PROFILE);
    expect(mergeSelectedReferenceMedia([], resolved)).toHaveLength(1);
    expect(mergeSelectedReferenceMedia([], resolved)[0]?.providerAssetReview?.status).toBe("ACTIVE");
  });

  it("rejects another International model profile even when ACTIVE and current", () => {
    const historical = projection({ id: "historical", status: "FAILED" });
    const otherModelCurrent = projection({ id: "current", profile: S20_PROFILE, status: "ACTIVE" });
    const [resolved] = resolveCurrentReferenceProjections([historical], [historical, otherModelCurrent], S25_PROFILE);
    expect(resolved.id).toBe("historical");
    expect(resolved.providerAssetReview).toBeUndefined();
  });

  it("returns to the exact S25 profile after switching International models", () => {
    const selected = projection({ id: "historical", status: "FAILED" });
    const s25Current = projection({ id: "current", status: "ACTIVE" });
    const s20Current = projection({ id: "s20-current", profile: S20_PROFILE, status: "ACTIVE" });
    const [s25Initial] = resolveCurrentReferenceProjections([selected], [selected, s25Current], S25_PROFILE);
    const [s20] = resolveCurrentReferenceProjections([selected], [selected, s20Current], S20_PROFILE);
    const [s25Return] = resolveCurrentReferenceProjections([selected], [selected, s25Current], S25_PROFILE);
    expect(s25Initial.providerAssetReview?.referenceBindingProfileId).toBe(S25_PROFILE);
    expect(s20.providerAssetReview?.referenceBindingProfileId).toBe(S20_PROFILE);
    expect(s25Return.providerAssetReview).toMatchObject({ referenceBindingProfileId: S25_PROFILE, status: "ACTIVE" });
  });

  it("refreshes preview data but rejects a mismatched binding profile", () => {
    const historical = projection({ id: "historical", status: "FAILED" });
    const wrongProfile = projection({ id: "current", profile: S20_PROFILE, status: "ACTIVE" });
    const unresolved = applyCurrentPrivateReferencePresentation(historical, wrongProfile, S25_PROFILE);
    const resolved = applyCurrentPrivateReferencePresentation(historical, projection({ id: "current", status: "ACTIVE" }), S25_PROFILE);
    expect(unresolved.previewUrl).toContain("current");
    expect(unresolved.providerAssetReview).toBeUndefined();
    expect(resolved.providerAssetReview).toMatchObject({ status: "ACTIVE", isCurrent: true });
  });

  it("fails closed when either catalog or private binding profile is missing", () => {
    const active = projection({ id: "current", status: "ACTIVE" });
    const missingPrivate = projection({ id: "current", profile: "", status: "ACTIVE" });
    expect(isCurrentProviderBindingProjection(active, "")).toBe(false);
    expect(isCurrentProviderBindingProjection(missingPrivate, S25_PROFILE)).toBe(false);
    expect(getFluxProxyReviewSummary([active], undefined).ready).toBe(false);
    expect(getFluxProxyReviewSummary([missingPrivate], S25_PROFILE).ready).toBe(false);
    expect(isOpaqueReferenceBindingProfileId(S25_PROFILE)).toBe(true);
    expect(isOpaqueReferenceBindingProfileId("seedance_2_5_international")).toBe(false);
    expect(isCurrentProviderBindingProjection(active, "seedance_2_5_international")).toBe(false);
  });

  it("requires the exact asset type, ACTIVE status, and current authority", () => {
    const wrongType = projection({ id: "current", status: "ACTIVE", type: "video", reviewAssetType: "image" });
    const processing = projection({ id: "current", status: "PROCESSING" });
    const failed = projection({ id: "current", status: "FAILED" });
    const stale = projection({ id: "current", status: "ACTIVE", isCurrent: false });
    expect(isCurrentProviderBindingProjection(wrongType, S25_PROFILE)).toBe(false);
    expect(isCurrentProviderBindingProjection(processing, S25_PROFILE)).toBe(false);
    expect(isCurrentProviderBindingProjection(failed, S25_PROFILE)).toBe(false);
    expect(isCurrentProviderBindingProjection(stale, S25_PROFILE)).toBe(false);
    expect(getFluxProxyReviewSummary([wrongType], S25_PROFILE)).toMatchObject({ ready: false, assetTypeMismatch: 1 });
  });

  it("keeps the existing Xinhankr reference transport shape unchanged", () => {
    const xinhankrReference: UploadMediaItem = {
      id: "xinhankr-reference",
      name: "Reference",
      type: "image",
      url: "https://cdn.shadowedge.example/reference.png",
      previewUrl: "https://cdn.shadowedge.example/reference.png",
      source: "asset-library",
      uploadStatus: "ready",
    };
    expect(mergeSelectedReferenceMedia([], [xinhankrReference])).toEqual([
      expect.objectContaining({ id: "xinhankr-reference", url: "https://cdn.shadowedge.example/reference.png", source: "reference_selected" }),
    ]);
  });
});

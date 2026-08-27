import { describe, expect, it } from "vitest";
import {
  applyCurrentPrivateReferencePresentation,
  mergeSelectedReferenceMedia,
  removeReferenceMediaSelection,
  resolveCurrentReferenceProjections,
} from "@/lib/video/videoReferenceSelection";
import { listFluxProxyMentionTokens } from "@/lib/video/fluxproxyInternational";
import type { UploadMediaItem } from "@/types/video";

const ASSET_ID = "33333333-3333-4333-8333-333333333333";
const S25_PROVIDER_MODEL = "dreamina-seedance-2-5-260628-df";
const S20_PROVIDER_MODEL = "dreamina-seedance-2-0-260428";

function projection({
  id,
  providerModel = S25_PROVIDER_MODEL,
  status,
}: {
  id: string;
  providerModel?: string;
  status: "ACTIVE" | "FAILED";
}): UploadMediaItem {
  return {
    id,
    assetId: ASSET_ID,
    name: "Private reference",
    type: "image",
    url: `https://api.shadowedge.example/private-preview/${id}`,
    previewUrl: `https://api.shadowedge.example/private-preview/${id}`,
    privateReference: true,
    source: id.includes("current") ? "asset-library" : "local_upload_cache",
    uploadStatus: "ready",
    providerAssetReview: {
      provider: "fluxproxy",
      providerModel,
      status,
      isCurrent: id.includes("current"),
      authoritySource: id.includes("current") ? "SUPERSEDING" : "BASE",
      authorityGeneration: id.includes("current") ? 2 : 1,
    },
  };
}

describe("video reference selection current binding lifecycle", () => {
  it("replaces a stale selection-time object with the exact current model projection", () => {
    const historical = projection({ id: "historical", status: "FAILED" });
    const current = projection({ id: "current", status: "ACTIVE" });

    const [resolved] = resolveCurrentReferenceProjections([historical], [historical, current], S25_PROVIDER_MODEL);

    expect(resolved.id).toBe("current");
    expect(resolved.assetId).toBe(ASSET_ID);
    expect(resolved.providerAssetReview).toMatchObject({
      providerModel: S25_PROVIDER_MODEL,
      status: "ACTIVE",
      isCurrent: true,
    });
  });

  it("removes every selection-specific projection for a canonical Asset on deselect", () => {
    const historical = projection({ id: "historical", status: "FAILED" });
    const current = projection({ id: "current", status: "ACTIVE" });

    expect(removeReferenceMediaSelection([historical, current], "current")).toEqual([]);
  });

  it("keeps repeated select, deselect, and reselect idempotent without duplicate references", () => {
    const current = projection({ id: "current", status: "ACTIVE" });
    const firstSelect = mergeSelectedReferenceMedia([], [current]);
    const deselected = removeReferenceMediaSelection(firstSelect, current.id);
    const firstReselect = mergeSelectedReferenceMedia(deselected, [current]);
    const secondReselect = mergeSelectedReferenceMedia(firstReselect, [current]);

    expect(firstSelect).toHaveLength(1);
    expect(deselected).toHaveLength(0);
    expect(firstReselect).toHaveLength(1);
    expect(secondReselect).toHaveLength(1);
    expect(secondReselect[0]?.providerAssetReview?.status).toBe("ACTIVE");
    expect(listFluxProxyMentionTokens(firstSelect)).toEqual(["@图1"]);
    expect(listFluxProxyMentionTokens(firstReselect)).toEqual(["@图1"]);
    expect(listFluxProxyMentionTokens(secondReselect)).toEqual(["@图1"]);
  });

  it("deduplicates different selection snapshots of the same canonical Asset", () => {
    const historical = projection({ id: "historical", status: "FAILED" });
    const current = projection({ id: "current", status: "ACTIVE" });
    const resolved = resolveCurrentReferenceProjections([historical, current], [historical, current], S25_PROVIDER_MODEL);

    expect(mergeSelectedReferenceMedia([], resolved)).toHaveLength(1);
    expect(mergeSelectedReferenceMedia([], resolved)[0]?.providerAssetReview?.status).toBe("ACTIVE");
  });

  it("does not reuse another provider model's current binding projection", () => {
    const historical = projection({ id: "historical", status: "FAILED" });
    const otherModelCurrent = projection({ id: "current", providerModel: S20_PROVIDER_MODEL, status: "ACTIVE" });

    const [resolved] = resolveCurrentReferenceProjections(
      [historical],
      [historical, otherModelCurrent],
      S25_PROVIDER_MODEL,
    );

    expect(resolved.id).toBe("historical");
    expect(resolved.providerAssetReview).toBeUndefined();
  });

  it("returns to the exact S25 current projection after switching provider models", () => {
    const selected = projection({ id: "historical", status: "FAILED" });
    const s25Current = projection({ id: "current", status: "ACTIVE" });
    const s20Current = projection({ id: "s20-current", providerModel: S20_PROVIDER_MODEL, status: "ACTIVE" });

    const [s25Initial] = resolveCurrentReferenceProjections([selected], [selected, s25Current], S25_PROVIDER_MODEL);
    const [s20] = resolveCurrentReferenceProjections([selected], [selected, s20Current], S20_PROVIDER_MODEL);
    const [s25Return] = resolveCurrentReferenceProjections([selected], [selected, s25Current], S25_PROVIDER_MODEL);

    expect(s25Initial.providerAssetReview?.providerModel).toBe(S25_PROVIDER_MODEL);
    expect(s20.providerAssetReview?.providerModel).toBe(S20_PROVIDER_MODEL);
    expect(s25Return.providerAssetReview).toMatchObject({ providerModel: S25_PROVIDER_MODEL, status: "ACTIVE" });
  });

  it("keeps preview refresh separate from binding authority", () => {
    const historical = projection({ id: "historical", status: "FAILED" });
    const wrongModel = projection({ id: "current", providerModel: S20_PROVIDER_MODEL, status: "ACTIVE" });
    const unresolved = applyCurrentPrivateReferencePresentation(historical, wrongModel, S25_PROVIDER_MODEL);
    const resolved = applyCurrentPrivateReferencePresentation(historical, projection({ id: "current", status: "ACTIVE" }), S25_PROVIDER_MODEL);

    expect(unresolved.previewUrl).toContain("current");
    expect(unresolved.providerAssetReview).toBeUndefined();
    expect(resolved.providerAssetReview).toMatchObject({ status: "ACTIVE", isCurrent: true });
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
      expect.objectContaining({
        id: "xinhankr-reference",
        url: "https://cdn.shadowedge.example/reference.png",
        source: "reference_selected",
      }),
    ]);
  });
});

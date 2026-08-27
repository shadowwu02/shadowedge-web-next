import { mergeMediaAssets } from "@/lib/media-assets";
import type { UploadMediaItem } from "@/types/video";

type PrivateReferencePresentation = {
  previewExpiresAt?: string | null;
  previewUrl?: string | null;
  providerAssetReview?: UploadMediaItem["providerAssetReview"] | null;
};

export function getReferenceSelectionIdentity(item: Pick<UploadMediaItem, "assetId" | "id" | "url">) {
  if (item.assetId) return `asset:${item.assetId}`;
  if (item.id) return `id:${item.id}`;
  return item.url ? `url:${item.url}` : "";
}

export function isCurrentProviderBindingProjection(
  item: Pick<UploadMediaItem, "providerAssetReview">,
  providerModel: string,
) {
  const review = item.providerAssetReview;
  return Boolean(review && review.isCurrent === true && review.providerModel === providerModel);
}

export function applyCurrentPrivateReferencePresentation(
  item: UploadMediaItem,
  presentation: PrivateReferencePresentation,
  providerModel: string,
) {
  const previewUrl = String(presentation.previewUrl || "").trim();
  const review = presentation.providerAssetReview;
  const currentReview = review?.isCurrent === true && review.providerModel === providerModel ? review : undefined;

  return {
    ...item,
    url: previewUrl || item.url,
    previewUrl: previewUrl || item.previewUrl,
    previewExpiresAt: presentation.previewExpiresAt || item.previewExpiresAt,
    providerAssetReview: currentReview,
  } satisfies UploadMediaItem;
}

export function resolveCurrentReferenceProjections(
  selectedItems: UploadMediaItem[],
  availableMedia: UploadMediaItem[],
  providerModel: string,
) {
  if (!providerModel) return selectedItems;

  return selectedItems.map((selected) => {
    if (!selected.assetId) return selected;
    const current = availableMedia.find(
      (candidate) =>
        candidate.assetId === selected.assetId &&
        isCurrentProviderBindingProjection(candidate, providerModel),
    );
    if (current) {
      return {
        ...selected,
        ...current,
        role: selected.role || current.role || "reference",
        source: "reference_selected" as const,
      };
    }

    if (selected.providerAssetReview && !isCurrentProviderBindingProjection(selected, providerModel)) {
      return { ...selected, providerAssetReview: undefined };
    }
    return selected;
  });
}

export function mergeSelectedReferenceMedia(
  currentItems: UploadMediaItem[],
  selectedItems: UploadMediaItem[],
) {
  const selectedByIdentity = new Map(
    selectedItems
      .map((item) => [getReferenceSelectionIdentity(item), item] as const)
      .filter(([identity]) => Boolean(identity)),
  );
  const consumed = new Set<string>();
  const appendedIdentities = new Set<string>();
  const replaced = currentItems.map((current) => {
    const identity = getReferenceSelectionIdentity(current);
    const selected = selectedByIdentity.get(identity);
    if (!selected) return current;
    consumed.add(identity);
    return {
      ...current,
      ...selected,
      role: selected.role || current.role || "reference",
      source: "reference_selected" as const,
    };
  });
  const appended = selectedItems
    .filter((selected) => {
      const identity = getReferenceSelectionIdentity(selected);
      if (consumed.has(identity) || appendedIdentities.has(identity)) return false;
      appendedIdentities.add(identity);
      return true;
    })
    .map((selected) => ({
      ...selected,
      role: selected.role || "reference",
      source: "reference_selected" as const,
    }));

  return mergeMediaAssets(replaced, appended).slice(0, 12);
}

export function removeReferenceMediaSelection(currentItems: UploadMediaItem[], id: string) {
  const selected = currentItems.find((item) => item.id === id || item.assetId === id);
  if (!selected?.assetId) return currentItems.filter((item) => item.id !== id);
  return currentItems.filter((item) => item.assetId !== selected.assetId);
}

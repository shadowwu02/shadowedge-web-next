import type { UploadMediaItem } from "@/types/video";

export const LEGACY_REFERENCE_REUPLOAD_REQUIRED = "LEGACY_REFERENCE_REUPLOAD_REQUIRED";
export const CANONICAL_REFERENCE_ASSET_ID_INVALID = "XINHANKR_ARTSDANCE_REFERENCE_ASSET_ID_INVALID";

const canonicalUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCanonicalAssetId(value: unknown): value is string {
  return typeof value === "string" && canonicalUuidPattern.test(value.trim());
}

export function isCanonicalReferenceItem(item: Pick<UploadMediaItem, "assetId">) {
  return isCanonicalAssetId(item.assetId);
}

export function getCanonicalReferenceStatus(
  item: Pick<UploadMediaItem, "assetId">,
): NonNullable<UploadMediaItem["canonicalReferenceStatus"]> {
  return isCanonicalReferenceItem(item) ? "CANONICAL" : LEGACY_REFERENCE_REUPLOAD_REQUIRED;
}

export class CanonicalReferenceAssetError extends Error {
  readonly code = CANONICAL_REFERENCE_ASSET_ID_INVALID;

  constructor() {
    super("Some reference assets are from a legacy version and must be re-uploaded before generation.");
    this.name = "CanonicalReferenceAssetError";
  }
}

export function assertCanonicalReferenceItems(items: Array<Pick<UploadMediaItem, "assetId">>) {
  if (items.some((item) => !isCanonicalReferenceItem(item))) {
    throw new CanonicalReferenceAssetError();
  }
}

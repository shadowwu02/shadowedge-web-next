export type CanonicalReferenceIdentityInput = {
  assetId?: unknown;
  id?: unknown;
  url?: unknown;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Canonical Asset identity is authoritative across Image and Video workspaces.
 * Local ids are a compatibility fallback; URLs are transport data and are only
 * used for legacy records that do not yet carry a stable Asset identity.
 */
export function getCanonicalReferenceIdentity(input: CanonicalReferenceIdentityInput) {
  const assetId = clean(input.assetId);
  if (assetId) return `asset:${assetId}`;
  const id = clean(input.id);
  if (id) return `id:${id}`;
  const url = clean(input.url);
  return url ? `url:${url}` : "";
}

export function getCanonicalReferenceIdentityCandidates(input: CanonicalReferenceIdentityInput) {
  const assetId = clean(input.assetId);
  const id = clean(input.id);
  const url = clean(input.url);
  return Array.from(new Set([
    assetId ? `asset:${assetId}` : "",
    assetId,
    id ? `id:${id}` : "",
    id,
    url ? `url:${url}` : "",
    url,
  ].filter(Boolean)));
}

export function isSameCanonicalReference(
  left: CanonicalReferenceIdentityInput,
  right: CanonicalReferenceIdentityInput,
) {
  const leftAssetId = clean(left.assetId);
  const rightAssetId = clean(right.assetId);
  if (leftAssetId || rightAssetId) return Boolean(leftAssetId && leftAssetId === rightAssetId);

  const rightCandidates = new Set(getCanonicalReferenceIdentityCandidates(right));
  return getCanonicalReferenceIdentityCandidates(left).some((identity) => rightCandidates.has(identity));
}

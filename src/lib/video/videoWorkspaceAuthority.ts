import {
  listMediaAssets,
  mediaAssetToUploadMediaItem,
  verifyMediaAssetReferences,
} from "@/lib/assets-api";
import { getCurrentUserProfile } from "@/lib/auth-api";
import type { UploadMediaItem } from "@/types/video";
import { ApiError } from "@/types/api";

export type VideoWorkspaceAuthorityScope = {
  userId: string;
  tenantId: string;
};

export type VideoWorkspaceAuthority = {
  scope: VideoWorkspaceAuthorityScope;
  media: UploadMediaItem[];
  checkedAt: number;
};

export type VideoWorkspaceMediaReconciliation = {
  authorized: UploadMediaItem[];
  unauthorized: UploadMediaItem[];
};

export class VideoReferenceAuthorityError extends Error {
  unavailableReferenceIndexes: number[];

  constructor(message: string, unavailableReferenceIndexes: number[] = []) {
    super(message);
    this.name = "VideoReferenceAuthorityError";
    this.unavailableReferenceIndexes = unavailableReferenceIndexes;
  }
}

export function getUnavailableVideoReferenceIndexes(error: unknown) {
  if (error instanceof VideoReferenceAuthorityError) return error.unavailableReferenceIndexes;
  const payload = error instanceof ApiError && error.payload && typeof error.payload === "object"
    ? error.payload as Record<string, unknown>
    : {};
  return Array.isArray(payload.unavailableReferenceIndexes)
    ? payload.unavailableReferenceIndexes
        .map(Number)
        .filter((index) => Number.isSafeInteger(index) && index > 0)
    : [];
}

export function normalizeVideoWorkspaceAuthorityScope(
  scope?: Partial<VideoWorkspaceAuthorityScope> | null,
): VideoWorkspaceAuthorityScope | null {
  const userId = String(scope?.userId || "").trim();
  const tenantId = String(scope?.tenantId || "").trim();
  return userId && tenantId ? { userId, tenantId } : null;
}

export function getVideoWorkspaceAuthorityScopeKey(
  scope?: Partial<VideoWorkspaceAuthorityScope> | null,
) {
  const normalized = normalizeVideoWorkspaceAuthorityScope(scope);
  return normalized ? `${normalized.userId}:${normalized.tenantId}` : "";
}

export function isSameVideoWorkspaceAuthorityScope(
  left?: Partial<VideoWorkspaceAuthorityScope> | null,
  right?: Partial<VideoWorkspaceAuthorityScope> | null,
) {
  const leftKey = getVideoWorkspaceAuthorityScopeKey(left);
  return Boolean(leftKey && leftKey === getVideoWorkspaceAuthorityScopeKey(right));
}

export function reconcileVideoWorkspaceMedia(
  media: UploadMediaItem[],
  authority: VideoWorkspaceAuthority,
): VideoWorkspaceMediaReconciliation {
  const authorityByAssetId = new Map(
    authority.media
      .filter((item) => item.assetId)
      .map((item) => [String(item.assetId), item]),
  );
  const authorized: UploadMediaItem[] = [];
  const unauthorized: UploadMediaItem[] = [];
  const seen = new Set<string>();

  media.forEach((item) => {
    const assetId = String(item.assetId || "").trim();
    const authoritative = assetId ? authorityByAssetId.get(assetId) : undefined;
    if (!authoritative) {
      unauthorized.push(item);
      return;
    }
    if (seen.has(assetId)) return;
    seen.add(assetId);
    authorized.push({
      ...item,
      ...authoritative,
      role: item.role || authoritative.role,
      source: item.source || authoritative.source,
    });
  });

  return { authorized, unauthorized };
}

export async function loadVideoWorkspaceAuthority(
  scope: VideoWorkspaceAuthorityScope,
): Promise<VideoWorkspaceAuthority> {
  const normalizedScope = normalizeVideoWorkspaceAuthorityScope(scope);
  if (!normalizedScope) throw new Error("Video workspace authority is unavailable.");

  const media: UploadMediaItem[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 10; page += 1) {
    const result = await listMediaAssets({ cursor, limit: 100, status: "ready" });
    media.push(
      ...result.assets
        .map(mediaAssetToUploadMediaItem)
        .filter((item): item is UploadMediaItem => Boolean(item)),
    );
    cursor = result.nextCursor;
    if (!cursor) break;
  }

  return { scope: normalizedScope, media, checkedAt: Date.now() };
}

export async function loadVerifiedVideoWorkspaceAuthority(
  expectedScope: VideoWorkspaceAuthorityScope,
): Promise<VideoWorkspaceAuthority> {
  const auth = await getCurrentUserProfile();
  const actualScope = normalizeVideoWorkspaceAuthorityScope({
    userId: auth.user?.id,
    tenantId: auth.tenantAccess?.tenant?.id,
  });
  if (!actualScope || !isSameVideoWorkspaceAuthorityScope(actualScope, expectedScope)) {
    throw new Error("This media is not available in the current workspace. Please choose it again from My Assets.");
  }
  return loadVideoWorkspaceAuthority(actualScope);
}

export function buildVideoReferenceAuthorityRequest(references: UploadMediaItem[]) {
  const seen = new Set<string>();
  return references.reduce<Array<{ assetId: string; type: UploadMediaItem["type"] }>>((items, reference) => {
    const assetId = String(reference.assetId || "").trim();
    if (!assetId || seen.has(assetId)) return items;
    seen.add(assetId);
    items.push({ assetId, type: reference.type });
    return items;
  }, []);
}

export async function loadVerifiedVideoReferenceAuthority(
  expectedScope: VideoWorkspaceAuthorityScope,
  references: UploadMediaItem[],
  model: string,
): Promise<VideoWorkspaceAuthority> {
  const auth = await getCurrentUserProfile();
  const actualScope = normalizeVideoWorkspaceAuthorityScope({
    userId: auth.user?.id,
    tenantId: auth.tenantAccess?.tenant?.id,
  });
  if (!actualScope || !isSameVideoWorkspaceAuthorityScope(actualScope, expectedScope)) {
    throw new Error("A referenced media item is unavailable. Please select it again.");
  }
  const requested = buildVideoReferenceAuthorityRequest(references);
  if (!requested.length) return { scope: actualScope, media: [], checkedAt: Date.now() };

  let verified;
  try {
    verified = await verifyMediaAssetReferences({ model, references: requested });
  } catch (error) {
    const indexes = getUnavailableVideoReferenceIndexes(error);
    if (indexes.length) {
      throw new VideoReferenceAuthorityError(
        error instanceof Error ? error.message : "A referenced media item is unavailable. Please select it again.",
        indexes,
      );
    }
    throw error;
  }
  const expectedIds = requested.map((reference) => reference.assetId);
  if (verified.checkedAssetIds.length !== expectedIds.length ||
      verified.checkedAssetIds.some((assetId, index) => assetId !== expectedIds[index])) {
    throw new Error("A referenced media item is unavailable. Please select it again.");
  }
  const media = verified.assets
    .map(mediaAssetToUploadMediaItem)
    .filter((item): item is UploadMediaItem => Boolean(item));
  if (media.length !== requested.length) {
    throw new Error("A referenced media item is unavailable. Please select it again.");
  }
  return { scope: actualScope, media, checkedAt: verified.checkedAt };
}

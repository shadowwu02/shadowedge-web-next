import { listMediaAssets, mediaAssetToUploadMediaItem } from "@/lib/assets-api";
import { getCurrentUserProfile } from "@/lib/auth-api";
import type { UploadMediaItem } from "@/types/video";

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

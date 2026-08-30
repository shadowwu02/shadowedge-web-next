import {
  findPromptMentions,
  getReadyMentionableMediaItems,
  getReferencePromptBindings,
  type MentionableMediaItem,
  type PromptMention,
  type ReferencePromptBinding,
} from "@/lib/video-mentions";
import { isCanonicalReferenceItem } from "@/lib/video/canonicalReferenceAssets";
import {
  sanitizeVideoMentionBindings,
  serializeMentionBindings,
  type VideoMentionBinding,
} from "@/lib/video/videoMentionBindings";
import type { UploadMediaItem, UploadMediaType } from "@/types/video";
import {
  reconcileVideoWorkspaceMedia,
  type VideoWorkspaceAuthority,
} from "@/lib/video/videoWorkspaceAuthority";

export type VideoPromptReferenceCounts = Record<UploadMediaType, number>;

export type VideoPromptBoundReferenceState = {
  activeBindings: ReferencePromptBinding[];
  activeItems: UploadMediaItem[];
  availableItems: MentionableMediaItem[];
  counts: VideoPromptReferenceCounts;
  invalidCanonicalItems: ReferencePromptBinding[];
  mentionBindings: VideoMentionBinding[];
  promptMentions: PromptMention[];
  resolvedItems: ReferencePromptBinding[];
  unresolvedMentions: PromptMention[];
  unauthorizedItems: ReferencePromptBinding[];
};

function countReferences(items: Array<Pick<MentionableMediaItem, "type">>): VideoPromptReferenceCounts {
  return items.reduce<VideoPromptReferenceCounts>(
    (counts, item) => {
      counts[item.type] += 1;
      return counts;
    },
    { audio: 0, image: 0, video: 0 },
  );
}

function mentionKey(mention: Pick<PromptMention, "token" | "type">) {
  return `${mention.type}:${mention.token}`;
}

/**
 * Single authority for references that participate in the current generation.
 * Uploaded/selected media remains available in the Tray, but it is active only
 * when a Prompt @ mention resolves to that ready, canonical media identity.
 */
export function resolveVideoPromptBoundReferences({
  media,
  mentionBindings = [],
  prompt,
  workspaceAuthority,
  workspaceAuthorityRequired = false,
}: {
  media: UploadMediaItem[];
  mentionBindings?: VideoMentionBinding[];
  prompt: string;
  workspaceAuthority?: VideoWorkspaceAuthority;
  workspaceAuthorityRequired?: boolean;
}): VideoPromptBoundReferenceState {
  const promptMentions = findPromptMentions(prompt);
  const originalBindings = sanitizeVideoMentionBindings(
    prompt,
    serializeMentionBindings(mentionBindings),
    media,
  ).mentionBindings;
  const originalAvailableItems = getReadyMentionableMediaItems(media);
  const originalResolvedItems = promptMentions.length
    ? getReferencePromptBindings(prompt, originalAvailableItems, originalBindings)
    : [];
  const reconciliation = workspaceAuthority
    ? reconcileVideoWorkspaceMedia(media, workspaceAuthority)
    : workspaceAuthorityRequired
      ? { authorized: [], unauthorized: media }
      : { authorized: media, unauthorized: [] };
  const authorizedMedia = reconciliation.authorized;
  const authoritativeIdByOriginalId = new Map<string, string>();
  if (workspaceAuthority) {
    const authoritativeByAssetId = new Map(
      workspaceAuthority.media
        .filter((item) => item.assetId)
        .map((item) => [String(item.assetId), item]),
    );
    media.forEach((item) => {
      const authoritative = item.assetId ? authoritativeByAssetId.get(String(item.assetId)) : undefined;
      if (!authoritative) return;
      [item.id, item.url].filter(Boolean).forEach((identity) => authoritativeIdByOriginalId.set(String(identity), authoritative.id));
    });
  }
  const authorityRemappedBindings = originalBindings.map((binding) => ({
    ...binding,
    mediaId: authoritativeIdByOriginalId.get(binding.mediaId) || binding.mediaId,
  }));
  const sanitizedBindings = sanitizeVideoMentionBindings(
    prompt,
    authorityRemappedBindings,
    authorizedMedia,
  ).mentionBindings;
  const availableItems = getReadyMentionableMediaItems(authorizedMedia);
  const resolvedItems = promptMentions.length
    ? getReferencePromptBindings(prompt, availableItems, sanitizedBindings)
    : [];
  const resolvedMentionKeys = new Set(resolvedItems.map((item) => mentionKey(item)));
  const unresolvedMentions = promptMentions.filter(
    (mention, index, mentions) =>
      mentions.findIndex((candidate) => mentionKey(candidate) === mentionKey(mention)) === index &&
      !resolvedMentionKeys.has(mentionKey(mention)),
  );
  const invalidCanonicalItems = resolvedItems.filter((item) => !isCanonicalReferenceItem(item));
  const activeBindings = resolvedItems.filter(isCanonicalReferenceItem);
  const activeItems = activeBindings
    .map((binding) => authorizedMedia.find((item) => item.id === binding.id || item.url === binding.url))
    .filter((item): item is UploadMediaItem => Boolean(item));
  const authorizedAssetIds = new Set(authorizedMedia.map((item) => item.assetId).filter(Boolean));
  const unauthorizedItems = workspaceAuthority || workspaceAuthorityRequired
    ? originalResolvedItems.filter((item) => !item.assetId || !authorizedAssetIds.has(item.assetId))
    : [];

  return {
    activeBindings,
    activeItems,
    availableItems,
    counts: countReferences(activeItems),
    invalidCanonicalItems,
    mentionBindings: sanitizedBindings,
    promptMentions,
    resolvedItems,
    unresolvedMentions,
    unauthorizedItems,
  };
}

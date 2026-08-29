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
}: {
  media: UploadMediaItem[];
  mentionBindings?: VideoMentionBinding[];
  prompt: string;
}): VideoPromptBoundReferenceState {
  const availableItems = getReadyMentionableMediaItems(media);
  const promptMentions = findPromptMentions(prompt);
  const sanitizedBindings = sanitizeVideoMentionBindings(
    prompt,
    serializeMentionBindings(mentionBindings),
    media,
  ).mentionBindings;
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
    .map((binding) => media.find((item) => item.id === binding.id || item.url === binding.url))
    .filter((item): item is UploadMediaItem => Boolean(item));

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
  };
}

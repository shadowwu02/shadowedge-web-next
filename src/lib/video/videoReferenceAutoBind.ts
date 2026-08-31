import { getReadyMentionableMediaItems } from "@/lib/video-mentions";
import {
  createMentionBinding,
  type VideoMentionBinding,
} from "@/lib/video/videoMentionBindings";
import type { UploadMediaItem } from "@/types/video";

function mediaIdentities(item: Pick<UploadMediaItem, "assetId" | "id" | "url">) {
  return [item.id, item.assetId, item.url].map((value) => String(value || "").trim()).filter(Boolean);
}

function sameMedia(left: UploadMediaItem, right: UploadMediaItem) {
  const rightIds = new Set(mediaIdentities(right));
  return mediaIdentities(left).some((identity) => rightIds.has(identity));
}

export function autoBindSelectedVideoReferences({
  media,
  mentionBindings,
  prompt,
  selected,
}: {
  media: UploadMediaItem[];
  mentionBindings: VideoMentionBinding[];
  prompt: string;
  selected: UploadMediaItem[];
}) {
  const mentionItems = getReadyMentionableMediaItems(media);
  const nextBindings = [...mentionBindings];
  const tokens: string[] = [];

  selected.forEach((selectedItem) => {
    const mediaItem = media.find((item) => sameMedia(item, selectedItem));
    if (!mediaItem) return;
    const mention = mentionItems.find((item) => item.id === mediaItem.id || item.assetId === mediaItem.assetId);
    if (!mention) return;
    const identities = new Set(mediaIdentities(mediaItem));
    if (nextBindings.some((binding) => identities.has(binding.mediaId))) return;

    nextBindings.push(createMentionBinding(mediaItem, mention.display, {
      sourceTokenText: mention.token,
    }));
    tokens.push(mention.token);
  });

  const basePrompt = String(prompt || "").trimEnd();
  const suffix = tokens.join(" ");
  return {
    mentionBindings: nextBindings,
    prompt: suffix ? `${basePrompt}${basePrompt ? " " : ""}${suffix}` : prompt,
  };
}

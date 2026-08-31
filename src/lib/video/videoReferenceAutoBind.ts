import { getReadyMentionableMediaItems } from "@/lib/video-mentions";
import {
  createMentionBinding,
  type VideoMentionBinding,
} from "@/lib/video/videoMentionBindings";
import type { UploadMediaItem } from "@/types/video";
import {
  getCanonicalReferenceIdentity,
  isSameCanonicalReference,
} from "@/lib/reference/referenceIdentity";

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
    const mediaItem = media.find((item) => isSameCanonicalReference(item, selectedItem));
    if (!mediaItem) return;
    const mention = mentionItems.find((item) => isSameCanonicalReference(item, mediaItem));
    if (!mention) return;
    const identity = getCanonicalReferenceIdentity(mediaItem);
    if (!identity || nextBindings.some((binding) => binding.mediaId === identity)) return;

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

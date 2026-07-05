import type { UploadMediaItem, UploadMediaType, VideoGenerationRequest } from "@/types/video";
import type { VideoMentionBinding } from "@/lib/video/videoMentionBindings";
import { normalizeMediaAssetUrl } from "@/lib/media-assets";

export type MentionableMediaItem = {
  id: string;
  type: UploadMediaType;
  index: number;
  display: string;
  token: string;
  url: string;
  previewUrl?: string;
  title: string;
  name?: string;
  mimeType?: string;
  size?: number;
  duration?: number;
};

export type PromptMention = {
  type: UploadMediaType;
  kind: string;
  index: number;
  display: string;
  token: string;
  start: number;
  end: number;
};

const mentionKindByType: Record<UploadMediaType, string> = {
  image: "图",
  video: "视频",
  audio: "音频",
};

const mentionTypeByKind: Record<string, UploadMediaType> = {
  图: "image",
  视频: "video",
  音频: "audio",
};

const mentionRegex = /【@(图|视频|音频)(\d+)】|@(图|视频|音频)(\d+)/g;

function isRemoteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export function getMentionKind(type: UploadMediaType) {
  return mentionKindByType[type] || mentionKindByType.image;
}

export function getMentionType(kind: string): UploadMediaType {
  return mentionTypeByKind[kind] || "image";
}

export function getMentionDisplay(type: UploadMediaType, index: number) {
  return `@${getMentionKind(type)}${index}`;
}

export function getMentionToken(type: UploadMediaType, index: number) {
  return `【${getMentionDisplay(type, index)}】`;
}

export function getReadyMentionableMediaItems(media: UploadMediaItem[]): MentionableMediaItem[] {
  const counters: Record<UploadMediaType, number> = { image: 0, video: 0, audio: 0 };

  return media
    .map((item) => ({
      item,
      previewUrl: normalizeMediaAssetUrl(item.previewUrl) || normalizeMediaAssetUrl(item.url),
      url: normalizeMediaAssetUrl(item.url),
    }))
    .filter(({ item, url }) => item.uploadStatus === "ready" && url && isRemoteUrl(url))
    .map(({ item, previewUrl, url }) => {
      counters[item.type] += 1;
      const index = counters[item.type];

      return {
        id: item.id,
        type: item.type,
        index,
        display: getMentionDisplay(item.type, index),
        token: getMentionToken(item.type, index),
        url,
        previewUrl,
        title: item.name || `${getMentionKind(item.type)}${index}`,
        name: item.name,
        mimeType: item.mimeType,
        size: item.size,
        duration: item.duration,
      };
    });
}

export function findPromptMentions(prompt: string): PromptMention[] {
  const source = String(prompt || "");
  const mentions: PromptMention[] = [];

  for (const match of source.matchAll(mentionRegex)) {
    const kind = match[1] || match[3] || "图";
    const index = Number(match[2] || match[4] || 0);
    if (!index) continue;

    const type = getMentionType(kind);
    const start = match.index || 0;

    mentions.push({
      type,
      kind,
      index,
      display: getMentionDisplay(type, index),
      token: getMentionToken(type, index),
      start,
      end: start + match[0].length,
    });
  }

  return mentions;
}

export function convertVisibleMentionsToTokens(prompt: string) {
  return String(prompt || "").replace(mentionRegex, (_match, bracketKind, bracketIndex, visibleKind, visibleIndex) => {
    const type = getMentionType(bracketKind || visibleKind || "图");
    const index = Number(bracketIndex || visibleIndex || 0);
    return index ? getMentionToken(type, index) : _match;
  });
}

export function getMissingPromptMentions(prompt: string, media: UploadMediaItem[]) {
  const readyItems = getReadyMentionableMediaItems(media);
  const seen = new Set<string>();

  return findPromptMentions(prompt).filter((mention) => {
    const key = `${mention.type}:${mention.index}`;
    if (seen.has(key)) return false;
    seen.add(key);

    return !readyItems.some((item) => item.type === mention.type && item.index === mention.index);
  });
}

function mentionMatchesBinding(mention: PromptMention, binding: VideoMentionBinding) {
  const candidates = new Set(
    [binding.displayLabel, binding.sourceTokenText, convertVisibleMentionsToTokens(binding.displayLabel), convertVisibleMentionsToTokens(binding.sourceTokenText)]
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  );

  return candidates.has(mention.display) || candidates.has(mention.token);
}

function getMediaAwarePromptItemsFromPrompt(
  promptText: string,
  mediaItems: MentionableMediaItem[],
  mentionBindings: VideoMentionBinding[],
) {
  const validItems = mediaItems.filter((item) => item.url && isRemoteUrl(item.url));
  const mentions = findPromptMentions(promptText);
  const mappedItems: MentionableMediaItem[] = [];
  const seen = new Set<string>();

  mentions.forEach((mention) => {
    const binding = mentionBindings.find((item) => mentionMatchesBinding(mention, item));
    const mediaItem = binding
      ? validItems.find((item) => item.id === binding.mediaId || item.url === binding.mediaId)
      : validItems.find((item) => item.type === mention.type && item.index === mention.index);
    if (!mediaItem) return;

    const key = `${mention.token}:${mediaItem.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    mappedItems.push({
      ...mediaItem,
      display: mention.display,
      token: mention.token,
    });
  });

  return mappedItems;
}

export function buildMediaAwarePrompt(
  promptText: string,
  mediaItems: MentionableMediaItem[],
  mentionBindings: VideoMentionBinding[] = [],
) {
  const cleanPrompt = convertVisibleMentionsToTokens(String(promptText || "").trim());
  const validItems = mediaItems.filter((item) => item.url && isRemoteUrl(item.url));
  const promptMentions = findPromptMentions(promptText);
  const promptMappedItems = mentionBindings.length ? getMediaAwarePromptItemsFromPrompt(promptText, mediaItems, mentionBindings) : [];
  const mappingItems = mentionBindings.length && promptMentions.length ? promptMappedItems : validItems;

  if (!mappingItems.length) return cleanPrompt;

  const mapping = mappingItems
    .map((item) => {
      if (item.type === "video") return `${item.token} = reference video ${item.index}`;
      if (item.type === "audio") return `${item.token} = reference audio ${item.index}`;
      return `${item.token} = reference image ${item.index}`;
    })
    .join("\n");

  return ["Reference media mapping:", mapping, "", "User prompt:", cleanPrompt].join("\n");
}

export function toGenerationMediaList(items: MentionableMediaItem[]): VideoGenerationRequest["mediaList"] {
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    url: item.url,
    role: "reference",
    duration: item.duration,
    name: item.name || item.title,
    mimeType: item.mimeType,
    size: item.size,
  }));
}

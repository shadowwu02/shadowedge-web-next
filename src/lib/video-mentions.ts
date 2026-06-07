import type { UploadMediaItem, UploadMediaType, VideoGenerationRequest } from "@/types/video";

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
    .filter((item) => item.uploadStatus === "ready" && item.url && isRemoteUrl(item.url))
    .map((item) => {
      counters[item.type] += 1;
      const index = counters[item.type];

      return {
        id: item.id,
        type: item.type,
        index,
        display: getMentionDisplay(item.type, index),
        token: getMentionToken(item.type, index),
        url: item.url || "",
        previewUrl: item.previewUrl || item.url,
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

export function buildMediaAwarePrompt(promptText: string, mediaItems: MentionableMediaItem[]) {
  const cleanPrompt = convertVisibleMentionsToTokens(String(promptText || "").trim());
  const validItems = mediaItems.filter((item) => item.url && isRemoteUrl(item.url));

  if (!validItems.length) return cleanPrompt;

  const mapping = validItems
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

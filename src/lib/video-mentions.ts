import type { UploadMediaItem, UploadMediaType, VideoGenerationRequest } from "@/types/video";
import type { VideoMentionBinding } from "@/lib/video/videoMentionBindings";
import { normalizeMediaAssetUrl } from "@/lib/media-assets";

export type MentionableMediaItem = {
  id: string;
  type: UploadMediaType;
  index: number;
  display: string;
  displayToken: string;
  localizedToken: string;
  canonicalToken: string;
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

export type ReferencePromptBinding = MentionableMediaItem & {
  fallbackLabel: string;
  label: string;
  mention?: PromptMention;
};

type BuildMediaAwarePromptOptions = {
  aspectRatio?: string;
};

const mentionKindByType: Record<UploadMediaType, string> = {
  image: "图",
  video: "视频",
  audio: "音频",
};

const mentionTypeByKind: Record<string, UploadMediaType> = {
  图片: "image",
  图: "image",
  视频: "video",
  音频: "audio",
  image: "image",
  video: "video",
  audio: "audio",
};

const mentionRegex = /【@(图片|图|视频|音频|Image|Video|Audio)\s*(\d+)】|@(图片|图|视频|音频|Image|Video|Audio)\s*(\d+)/gi;

function isRemoteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function getReferenceKindLabel(type: UploadMediaType, index: number) {
  if (type === "video") return `reference video ${index}`;
  if (type === "audio") return `reference audio ${index}`;
  return `reference image ${index}`;
}

function extractUserPromptFromStructuredPrompt(prompt: string) {
  const source = String(prompt || "").trim();
  const userPromptMarker = "\nUser prompt:";
  const userPromptIndex = source.indexOf(userPromptMarker);
  const fallbackUserPromptIndex = source.startsWith("User prompt:") ? 0 : -1;
  const markerIndex = userPromptIndex >= 0 ? userPromptIndex + userPromptMarker.length : fallbackUserPromptIndex + "User prompt:".length;

  if (userPromptIndex < 0 && fallbackUserPromptIndex < 0) return source;

  const tail = source.slice(markerIndex).trim();
  const nextSectionIndex = tail.search(/\n(?:Style and safety constraints|Reference media mapping|Character and scene binding):/i);
  return (nextSectionIndex >= 0 ? tail.slice(0, nextSectionIndex) : tail).trim();
}

function cleanMentionLabel(value: string) {
  const normalized = String(value || "")
    .replace(/^[\s:：,，、\-—–|]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  const [firstClause] = normalized.split(/[。！？!?；;，,\r\n]/);
  return String(firstClause || "").trim().slice(0, 48);
}

function extractMentionLabel(prompt: string, mention: PromptMention) {
  const tail = String(prompt || "").slice(mention.end);
  const sameLine = tail.split(/\r?\n/)[0] || "";
  return cleanMentionLabel(sameLine);
}

function getMediaFallbackLabel(item: MentionableMediaItem) {
  return String(item.name || item.title || getReferenceKindLabel(item.type, item.index)).trim();
}

export function getMentionKind(type: UploadMediaType) {
  return mentionKindByType[type] || mentionKindByType.image;
}

export function getMentionType(kind: string): UploadMediaType {
  return mentionTypeByKind[String(kind || "").trim().toLowerCase()] || mentionTypeByKind[kind] || "image";
}

export function getMentionDisplay(type: UploadMediaType, index: number) {
  return `@${getMentionKind(type)}${index}`;
}

export function getMentionDisplayToken(type: UploadMediaType, index: number) {
  if (type === "video") return `@Video ${index}`;
  if (type === "audio") return `@Audio ${index}`;
  return `@Image ${index}`;
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
        displayToken: getMentionDisplayToken(item.type, index),
        localizedToken: getMentionDisplay(item.type, index),
        canonicalToken: getMentionToken(item.type, index),
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

export function getReferencePromptBindings(
  promptText: string,
  mediaItems: MentionableMediaItem[],
  mentionBindings: VideoMentionBinding[] = [],
): ReferencePromptBinding[] {
  const validItems = mediaItems.filter((item) => item.url && isRemoteUrl(item.url));
  const promptSource = extractUserPromptFromStructuredPrompt(promptText);
  const mentions = findPromptMentions(promptSource);
  const promptMappedItems = getMediaAwarePromptItemsFromPrompt(promptSource, mediaItems, mentionBindings);
  const mappingItems = mentions.length ? promptMappedItems : validItems;

  return mappingItems.map((item) => {
    const mention = mentions.find((candidate) => candidate.type === item.type && candidate.index === item.index);
    const fallbackLabel = getMediaFallbackLabel(item);
    const extractedLabel = mention ? extractMentionLabel(promptSource, mention) : "";
    const label = extractedLabel || fallbackLabel || getReferenceKindLabel(item.type, item.index);

    return {
      ...item,
      fallbackLabel,
      label,
      mention,
    };
  });
}

function buildStyleConstraints(aspectRatio?: string) {
  const ratio = String(aspectRatio || "").trim();
  const constraints = [
    "Keep the same people and scene identity from the referenced media.",
    "Use the referenced images as visual identity and scene references.",
    "Do not invent unrelated main characters.",
    "Do not show ghosts, monsters, zombies, supernatural entities, gore, or bloody close-ups unless explicitly allowed by the user prompt.",
  ];

  if (ratio === "9:16") {
    constraints.push("Preserve vertical 9:16 if selected by the user.");
  } else if (ratio && ratio !== "auto") {
    constraints.push(`Preserve ${ratio} aspect ratio if selected by the user.`);
  }

  return constraints;
}

export function buildMediaAwarePrompt(
  promptText: string,
  mediaItems: MentionableMediaItem[],
  mentionBindings: VideoMentionBinding[] = [],
  options: BuildMediaAwarePromptOptions = {},
) {
  const userPrompt = extractUserPromptFromStructuredPrompt(promptText);
  const cleanPrompt = convertVisibleMentionsToTokens(userPrompt);
  const mappingItems = getReferencePromptBindings(userPrompt, mediaItems, mentionBindings);

  if (!mappingItems.length) return cleanPrompt;

  const mapping = mappingItems
    .map((item) => `${item.token} = ${getReferenceKindLabel(item.type, item.index)}`)
    .join("\n");
  const bindingLines = mappingItems
    .map((item) => `${item.token}${item.label ? ` ${item.label}` : ""}`)
    .join("\n");
  const styleConstraints = buildStyleConstraints(options.aspectRatio)
    .map((item) => `- ${item}`)
    .join("\n");

  return [
    "Reference media mapping:",
    mapping,
    "",
    "Character and scene binding:",
    bindingLines,
    "",
    "User prompt:",
    cleanPrompt,
    "",
    "Style and safety constraints:",
    styleConstraints,
  ].join("\n");
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

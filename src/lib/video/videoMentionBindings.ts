import {
  convertVisibleMentionsToTokens,
  findPromptMentions,
  getReadyMentionableMediaItems,
} from "@/lib/video-mentions";
import type { UploadMediaItem, UploadMediaType } from "@/types/video";

export type VideoMentionBinding = {
  tokenId: string;
  mediaId: string;
  mediaType: UploadMediaType;
  displayLabel: string;
  sourceTokenText: string;
  createdAt: number;
  updatedAt?: number;
};

export type ReconciledVideoMentionBinding = VideoMentionBinding & {
  currentDisplayLabel?: string;
  currentIndex?: number;
  currentTokenText?: string;
  isMissing: boolean;
  media?: UploadMediaItem;
};

type CreateMentionBindingOptions = {
  createdAt?: number;
  sourceTokenText?: string;
  tokenId?: string;
  updatedAt?: number;
};

function safeNow() {
  return Date.now();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function pickString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}

function isUploadMediaType(value: unknown): value is UploadMediaType {
  return value === "image" || value === "video" || value === "audio";
}

function getMediaId(media: Pick<UploadMediaItem, "id" | "url">) {
  return String(media.id || media.url || "").trim();
}

function normalizeTokenText(tokenText: string) {
  return convertVisibleMentionsToTokens(String(tokenText || "").trim());
}

function getBindingTokenCandidates(binding: VideoMentionBinding) {
  return new Set(
    [binding.sourceTokenText, binding.displayLabel, normalizeTokenText(binding.sourceTokenText), normalizeTokenText(binding.displayLabel)]
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  );
}

function sanitizeBinding(input: unknown): VideoMentionBinding | null {
  const raw = asRecord(input);
  const mediaType = raw.mediaType || raw.type;
  const mediaId = pickString(raw.mediaId, raw.media_id, raw.mediaID);
  const displayLabel = pickString(raw.displayLabel, raw.display_label, raw.display);
  const sourceTokenText = pickString(raw.sourceTokenText, raw.source_token_text, raw.tokenText, raw.token);
  const tokenId = pickString(raw.tokenId, raw.token_id, raw.id);
  const createdAt = Number(raw.createdAt || raw.created_at || 0) || 0;
  const updatedAt = Number(raw.updatedAt || raw.updated_at || 0) || undefined;

  if (!mediaId || !displayLabel || !sourceTokenText || !isUploadMediaType(mediaType)) return null;

  return {
    tokenId: tokenId || createMentionTokenId(),
    mediaId,
    mediaType,
    displayLabel,
    sourceTokenText,
    createdAt: createdAt || safeNow(),
    updatedAt,
  };
}

function findReadyMentionableForToken(tokenText: string, referenceMedia: UploadMediaItem[]) {
  const mention = findPromptMentions(tokenText)[0];
  if (!mention) return null;

  return (
    getReadyMentionableMediaItems(referenceMedia).find(
      (item) => item.type === mention.type && item.index === mention.index,
    ) || null
  );
}

export function createMentionTokenId() {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `mention_${randomId}`;
}

export function createMentionBinding(
  media: Pick<UploadMediaItem, "id" | "type" | "url">,
  displayLabel: string,
  options: CreateMentionBindingOptions = {},
): VideoMentionBinding {
  const now = options.createdAt || safeNow();

  return {
    tokenId: options.tokenId || createMentionTokenId(),
    mediaId: getMediaId(media),
    mediaType: media.type,
    displayLabel,
    sourceTokenText: options.sourceTokenText || displayLabel,
    createdAt: now,
    updatedAt: options.updatedAt,
  };
}

export function findMentionBindingForToken(
  bindings: VideoMentionBinding[],
  tokenText: string,
  referenceMedia: UploadMediaItem[] = [],
) {
  const normalizedToken = normalizeTokenText(tokenText);
  const explicitBinding =
    bindings.find((binding) => getBindingTokenCandidates(binding).has(tokenText.trim())) ||
    bindings.find((binding) => getBindingTokenCandidates(binding).has(normalizedToken));

  if (explicitBinding) return explicitBinding;

  const legacyItem = findReadyMentionableForToken(tokenText, referenceMedia);
  if (!legacyItem) return undefined;

  return createMentionBinding(
    { id: legacyItem.id, type: legacyItem.type, url: legacyItem.url },
    legacyItem.display,
    {
      sourceTokenText: tokenText,
      tokenId: `legacy_${legacyItem.type}_${legacyItem.index}`,
    },
  );
}

export function findMentionBindingForMedia(bindings: VideoMentionBinding[], mediaId: string) {
  const id = String(mediaId || "").trim();
  if (!id) return undefined;
  return bindings.find((binding) => binding.mediaId === id);
}

export function reconcileMentionBindings(
  bindings: VideoMentionBinding[],
  referenceMedia: UploadMediaItem[],
): ReconciledVideoMentionBinding[] {
  const readyItems = getReadyMentionableMediaItems(referenceMedia);

  return bindings.map((binding) => {
    const media = referenceMedia.find((item) => item.id === binding.mediaId || item.url === binding.mediaId);
    const currentMention = readyItems.find((item) => item.id === media?.id);

    return {
      ...binding,
      currentDisplayLabel: currentMention?.display,
      currentIndex: currentMention?.index,
      currentTokenText: currentMention?.token,
      isMissing: !media,
      media,
    };
  });
}

export function getMissingMentionBindings(bindings: VideoMentionBinding[], referenceMedia: UploadMediaItem[]) {
  return reconcileMentionBindings(bindings, referenceMedia).filter((binding) => binding.isMissing);
}

export function serializeMentionBindings(bindings: VideoMentionBinding[]) {
  return bindings
    .map((binding) => sanitizeBinding(binding))
    .filter((binding): binding is VideoMentionBinding => Boolean(binding));
}

export function parseMentionBindings(input: unknown): VideoMentionBinding[] {
  try {
    const parsed = typeof input === "string" ? JSON.parse(input) : input;
    const list = Array.isArray(parsed) ? parsed : [];
    return list
      .map((item) => sanitizeBinding(item))
      .filter((binding): binding is VideoMentionBinding => Boolean(binding));
  } catch {
    return [];
  }
}

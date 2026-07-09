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

export type SanitizedVideoMentionBindings = {
  mediaLabelMap: Record<string, string>;
  mentionBindings: VideoMentionBinding[];
  warnings: string[];
};

export type RemappedVideoMentionReferences = {
  mentionBindings: VideoMentionBinding[];
  prompt: string;
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

function getMediaIdentities(media: Pick<UploadMediaItem, "id" | "url">) {
  return [media.id, media.url].map((value) => String(value || "").trim()).filter(Boolean);
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

export function sanitizeVideoMentionBindings(
  prompt: string,
  bindings: VideoMentionBinding[],
  referenceMedia: UploadMediaItem[],
): SanitizedVideoMentionBindings {
  const readyItems = getReadyMentionableMediaItems(referenceMedia);
  const promptMentionTokens = new Set(
    findPromptMentions(prompt).flatMap((mention) => [mention.display, mention.token]).map((value) => normalizeTokenText(value)),
  );
  const mediaLabelMap: Record<string, string> = {};
  const mentionByIdentity = new Map<
    string,
    {
      display: string;
      identity: string;
      index: number;
      media: UploadMediaItem;
      token: string;
      type: UploadMediaType;
    }
  >();

  readyItems.forEach((mention) => {
    const media = referenceMedia.find((item) => item.id === mention.id || item.url === mention.url);
    if (!media) return;

    const identity = getMediaId(media);
    if (!identity) return;

    getMediaIdentities(media).forEach((key) => {
      mediaLabelMap[key] = mention.display;
      mentionByIdentity.set(key, {
        display: mention.display,
        identity,
        index: mention.index,
        media,
        token: mention.token,
        type: mention.type,
      });
    });
  });

  const sanitizedBindings = serializeMentionBindings(bindings);
  const nextBindings: VideoMentionBinding[] = [];
  const seenTokenIds = new Set<string>();
  const seenMediaTokens = new Set<string>();
  const labelOwners = new Map<string, string>();
  const warnings: string[] = [];

  sanitizedBindings.forEach((binding) => {
    if (seenTokenIds.has(binding.tokenId)) {
      warnings.push("duplicate_token_id");
      return;
    }
    seenTokenIds.add(binding.tokenId);

    const currentMention = mentionByIdentity.get(binding.mediaId);
    if (!currentMention) {
      warnings.push("missing_media");
      return;
    }

    if (currentMention.type !== binding.mediaType) {
      warnings.push("media_type_mismatch");
      return;
    }

    const labelOwner = labelOwners.get(currentMention.display);
    if (labelOwner && labelOwner !== currentMention.identity) {
      warnings.push("duplicate_active_label");
      return;
    }
    labelOwners.set(currentMention.display, currentMention.identity);

    const mediaTokenKey = `${currentMention.identity}:${currentMention.token}`;
    if (seenMediaTokens.has(mediaTokenKey)) {
      warnings.push("duplicate_media_token");
      return;
    }
    seenMediaTokens.add(mediaTokenKey);

    const nextBinding: VideoMentionBinding = {
      ...binding,
      mediaId: currentMention.identity,
      mediaType: currentMention.type,
      displayLabel: currentMention.display,
      sourceTokenText: currentMention.token,
    };
    const changed =
      nextBinding.mediaId !== binding.mediaId ||
      nextBinding.mediaType !== binding.mediaType ||
      nextBinding.displayLabel !== binding.displayLabel ||
      nextBinding.sourceTokenText !== binding.sourceTokenText;

    if (changed) {
      nextBinding.updatedAt = binding.updatedAt || binding.createdAt || safeNow();
      warnings.push("relabelled_binding");
    }

    if (promptMentionTokens.size && !promptMentionTokens.has(normalizeTokenText(currentMention.display))) {
      warnings.push("prompt_token_not_present");
    }

    nextBindings.push(nextBinding);
  });

  return {
    mediaLabelMap,
    mentionBindings: nextBindings,
    warnings: Array.from(new Set(warnings)),
  };
}

export function getMissingMentionBindings(bindings: VideoMentionBinding[], referenceMedia: UploadMediaItem[]) {
  return reconcileMentionBindings(bindings, referenceMedia).filter((binding) => binding.isMissing);
}

function findMediaByIdentity(referenceMedia: UploadMediaItem[], mediaId: string) {
  const id = String(mediaId || "").trim();
  if (!id) return undefined;
  return referenceMedia.find((item) => getMediaIdentities(item).includes(id));
}

function findReadyMentionableByMedia(media: UploadMediaItem, readyItems: ReturnType<typeof getReadyMentionableMediaItems>) {
  const identities = getMediaIdentities(media);
  return readyItems.find((item) => identities.includes(item.id) || identities.includes(item.url));
}

function findMediaForPromptMention(
  mention: ReturnType<typeof findPromptMentions>[number],
  bindings: VideoMentionBinding[],
  previousMedia: UploadMediaItem[],
) {
  const explicitBinding =
    findMentionBindingForToken(bindings, mention.token, previousMedia) ||
    findMentionBindingForToken(bindings, mention.display, previousMedia);

  if (explicitBinding) {
    const explicitMedia = findMediaByIdentity(previousMedia, explicitBinding.mediaId);
    if (explicitMedia) {
      return {
        binding: bindings.find((item) => item.tokenId === explicitBinding.tokenId),
        media: explicitMedia,
      };
    }
  }

  const previousMention = getReadyMentionableMediaItems(previousMedia).find(
    (item) => item.type === mention.type && item.index === mention.index,
  );
  const legacyMedia = previousMention ? findMediaByIdentity(previousMedia, previousMention.id) : undefined;

  return {
    binding: undefined,
    media: legacyMedia,
  };
}

function replacePromptMentionRanges(prompt: string, replacements: Array<{ end: number; start: number; token: string }>) {
  let nextPrompt = String(prompt || "");

  replacements
    .slice()
    .sort((left, right) => right.start - left.start)
    .forEach((replacement) => {
      nextPrompt = `${nextPrompt.slice(0, replacement.start)}${replacement.token}${nextPrompt.slice(replacement.end)}`;
    });

  return nextPrompt;
}

function upsertBindingForMedia(
  map: Map<string, VideoMentionBinding>,
  media: UploadMediaItem,
  displayLabel: string,
  sourceTokenText: string,
  existing?: VideoMentionBinding,
) {
  const identity = getMediaId(media);
  if (!identity || map.has(identity)) return;

  map.set(
    identity,
    createMentionBinding(
      { id: media.id, type: media.type, url: media.url },
      displayLabel,
      {
        createdAt: existing?.createdAt,
        sourceTokenText,
        tokenId: existing?.tokenId,
        updatedAt: safeNow(),
      },
    ),
  );
}

export function remapVideoMentionReferencesForMediaOrder({
  bindings,
  nextMedia,
  previousMedia,
  prompt,
}: {
  bindings: VideoMentionBinding[];
  nextMedia: UploadMediaItem[];
  previousMedia: UploadMediaItem[];
  prompt: string;
}): RemappedVideoMentionReferences {
  const sanitizedBindings = serializeMentionBindings(bindings);
  const mentions = findPromptMentions(prompt);
  const nextReadyItems = getReadyMentionableMediaItems(nextMedia);
  const replacements: Array<{ end: number; start: number; token: string }> = [];
  const nextBindingByMedia = new Map<string, VideoMentionBinding>();

  mentions.forEach((mention) => {
    const resolved = findMediaForPromptMention(mention, sanitizedBindings, previousMedia);
    if (!resolved.media) return;

    const nextMediaItem = findMediaByIdentity(nextMedia, getMediaId(resolved.media));
    if (!nextMediaItem) return;

    const nextMention = findReadyMentionableByMedia(nextMediaItem, nextReadyItems);
    if (!nextMention) return;

    if (nextMention.token !== mention.token) {
      replacements.push({
        start: mention.start,
        end: mention.end,
        token: nextMention.token,
      });
    }

    upsertBindingForMedia(nextBindingByMedia, nextMediaItem, nextMention.display, nextMention.token, resolved.binding);
  });

  sanitizedBindings.forEach((binding) => {
    const nextMediaItem = findMediaByIdentity(nextMedia, binding.mediaId);
    if (!nextMediaItem) return;
    const nextMention = findReadyMentionableByMedia(nextMediaItem, nextReadyItems);
    if (!nextMention) return;
    upsertBindingForMedia(nextBindingByMedia, nextMediaItem, nextMention.display, nextMention.token, binding);
  });

  const nextPrompt = replacePromptMentionRanges(prompt, replacements);
  const nextBindings = sanitizeVideoMentionBindings(
    nextPrompt,
    Array.from(nextBindingByMedia.values()),
    nextMedia,
  ).mentionBindings;

  return {
    prompt: nextPrompt,
    mentionBindings: nextBindings,
  };
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

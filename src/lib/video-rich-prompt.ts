import {
  findPromptMentions,
  getMentionDisplayToken,
  type PromptMention,
} from "@/lib/video-mentions";
import type { UploadMediaType } from "@/types/video";

export type RichPromptTextNode = {
  text: string;
  type: "text";
};

export type RichPromptMentionNode = {
  canonicalToken: string;
  displayToken: string;
  end: number;
  index: number;
  localizedToken: string;
  mention: PromptMention;
  start: number;
  type: "mention";
  mediaType: UploadMediaType;
};

export type RichPromptNode = RichPromptMentionNode | RichPromptTextNode;

export type RichPromptMenuRequest = {
  anchorEl: HTMLElement;
  range: {
    end: number;
    start: number;
  };
};

const activeMentionPattern = new RegExp(
  "@(?:\\u56fe|\\u89c6\\u9891|\\u97f3\\u9891|Image|Video|Audio)?\\s*\\d*$",
  "iu",
);

export function parsePromptTextToRichNodes(prompt: string): RichPromptNode[] {
  const source = String(prompt || "");
  const mentions = findPromptMentions(source);
  const nodes: RichPromptNode[] = [];
  let cursor = 0;

  mentions.forEach((mention) => {
    if (mention.start > cursor) {
      nodes.push({ type: "text", text: source.slice(cursor, mention.start) });
    }

    nodes.push({
      canonicalToken: mention.token,
      displayToken: getMentionDisplayToken(mention.type, mention.index),
      end: mention.end,
      index: mention.index,
      localizedToken: mention.display,
      mediaType: mention.type,
      mention,
      start: mention.start,
      type: "mention",
    });
    cursor = mention.end;
  });

  if (cursor < source.length) {
    nodes.push({ type: "text", text: source.slice(cursor) });
  }

  return nodes.length ? nodes : [{ type: "text", text: source }];
}

export function findActiveMentionRange(prompt: string, caretOffset: number) {
  const source = String(prompt || "");
  const beforeCaret = source.slice(0, Math.max(0, caretOffset));
  const match = beforeCaret.match(activeMentionPattern);
  if (!match) return null;

  return {
    start: beforeCaret.length - match[0].length,
    end: beforeCaret.length,
  };
}


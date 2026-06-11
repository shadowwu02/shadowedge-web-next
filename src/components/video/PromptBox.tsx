"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { MediaTypeIcon } from "@/components/video/MediaTypeIcon";
import {
  findPromptMentions,
  getReadyMentionableMediaItems,
  type MentionableMediaItem,
} from "@/lib/video-mentions";
import {
  createMentionBinding,
  findMentionBindingForToken,
  type VideoMentionBinding,
} from "@/lib/video/videoMentionBindings";
import type { UploadMediaItem, UploadMediaType } from "@/types/video";
import { useI18n } from "@/i18n/useI18n";

type PromptBoxProps = {
  value: string;
  media: UploadMediaItem[];
  mentionBindings?: VideoMentionBinding[];
  onChange: (value: string) => void;
  onMentionBindingsChange?: (next: VideoMentionBinding[] | ((current: VideoMentionBinding[]) => VideoMentionBinding[])) => void;
};

type ReplaceRange = {
  start: number;
  end: number;
};

type MenuPosition = {
  left: number;
  top: number;
};

type InsertMentionInput = {
  display: string;
  index?: number;
  mediaId?: string;
  token?: string;
  type?: UploadMediaType;
  url?: string;
};

type OpenMentionMenuInput = {
  anchorEl?: HTMLElement | null;
};

const mentionGroups: UploadMediaType[] = ["image", "video", "audio"];

function clampMenuPosition(left: number, top: number) {
  const menuWidth = 300;
  const menuHeight = 340;
  const gap = 12;

  return {
    left: Math.max(gap, Math.min(left, window.innerWidth - menuWidth - gap)),
    top: Math.max(gap, Math.min(top, window.innerHeight - menuHeight - gap)),
  };
}

function getTextareaCaretClientPosition(textarea: HTMLTextAreaElement, caretIndex: number): MenuPosition {
  const rect = textarea.getBoundingClientRect();
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");
  const marker = document.createElement("span");

  mirror.style.position = "fixed";
  mirror.style.left = `${rect.left}px`;
  mirror.style.top = `${rect.top}px`;
  mirror.style.width = `${rect.width}px`;
  mirror.style.height = `${rect.height}px`;
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordBreak = "break-word";
  mirror.style.overflow = "hidden";
  mirror.style.boxSizing = style.boxSizing;
  mirror.style.font = style.font;
  mirror.style.fontSize = style.fontSize;
  mirror.style.fontFamily = style.fontFamily;
  mirror.style.fontWeight = style.fontWeight;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;

  mirror.append(document.createTextNode(textarea.value.slice(0, caretIndex)));
  marker.textContent = "\u200b";
  mirror.append(marker);
  document.body.append(mirror);

  const markerRect = marker.getBoundingClientRect();
  const lineHeight = Number.parseFloat(style.lineHeight) || 22;
  const position = clampMenuPosition(markerRect.left, markerRect.top - textarea.scrollTop + lineHeight + 8);

  mirror.remove();
  return position;
}

function findMentionReplaceRange(prompt: string, selectionStart: number, selectionEnd: number): ReplaceRange {
  const mentions = findPromptMentions(prompt);
  const selectedMention = mentions.find((mention) => {
    if (selectionStart === selectionEnd) {
      return selectionStart >= mention.start && selectionStart <= mention.end;
    }
    return selectionStart < mention.end && selectionEnd > mention.start;
  });

  if (selectedMention) {
    return {
      start: selectedMention.start,
      end: selectedMention.end,
    };
  }

  if (selectionStart !== selectionEnd) {
    return { start: selectionStart, end: selectionEnd };
  }

  const beforeCaret = prompt.slice(0, selectionStart);
  const activeAtMention = beforeCaret.match(/@(图|视频|音频)?\d*$/u);

  if (activeAtMention) {
    return {
      start: selectionStart - activeAtMention[0].length,
      end: selectionEnd,
    };
  }

  return { start: selectionStart, end: selectionEnd };
}

function getMediaIdentity(media: Pick<UploadMediaItem, "id" | "url">) {
  return String(media.id || media.url || "").trim();
}

function sameMentionBinding(left: VideoMentionBinding, right: VideoMentionBinding) {
  return (
    left.tokenId === right.tokenId &&
    left.mediaId === right.mediaId &&
    left.mediaType === right.mediaType &&
    left.displayLabel === right.displayLabel &&
    left.sourceTokenText === right.sourceTokenText &&
    left.createdAt === right.createdAt &&
    left.updatedAt === right.updatedAt
  );
}

function getMissingMentionsWithBindings(prompt: string, media: UploadMediaItem[], bindings: VideoMentionBinding[]) {
  const readyItems = getReadyMentionableMediaItems(media);
  const seen = new Set<string>();

  return findPromptMentions(prompt).filter((mention) => {
    const binding = findMentionBindingForToken(bindings, mention.display, media) || findMentionBindingForToken(bindings, mention.token, media);
    const key = binding ? `binding:${binding.tokenId}:${mention.start}` : `legacy:${mention.type}:${mention.index}`;
    if (seen.has(key)) return false;
    seen.add(key);

    if (binding) {
      return !media.some((item) => item.id === binding.mediaId || item.url === binding.mediaId);
    }

    return !readyItems.some((item) => item.type === mention.type && item.index === mention.index);
  });
}

export function PromptBox({ value, media, mentionBindings = [], onChange, onMentionBindingsChange }: PromptBoxProps) {
  const { t, tf } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ left: 0, top: 0 });
  const [replaceRange, setReplaceRange] = useState<ReplaceRange | null>(null);

  const mentionItems = useMemo(() => getReadyMentionableMediaItems(media), [media]);
  const missingMentions = useMemo(
    () => getMissingMentionsWithBindings(value, media, mentionBindings),
    [media, mentionBindings, value],
  );

  function openMentionMenu(textarea: HTMLTextAreaElement, caretIndex: number) {
    setReplaceRange(findMentionReplaceRange(textarea.value, textarea.selectionStart || caretIndex, textarea.selectionEnd || caretIndex));
    setMenuPosition(getTextareaCaretClientPosition(textarea, caretIndex));
    setIsMenuOpen(true);
  }

  function openMentionMenuFromExternal(anchorEl?: HTMLElement | null) {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? value.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    setReplaceRange(textarea ? findMentionReplaceRange(textarea.value, selectionStart, selectionEnd) : { start: value.length, end: value.length });

    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      setMenuPosition(clampMenuPosition(rect.left, rect.bottom + 10));
    } else if (textarea) {
      setMenuPosition(getTextareaCaretClientPosition(textarea, selectionStart));
    } else {
      setMenuPosition(clampMenuPosition(18, 88));
    }

    setIsMenuOpen(true);

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  function closeMentionMenu() {
    setIsMenuOpen(false);
    setReplaceRange(null);
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextValue = event.target.value;
    const caretIndex = event.target.selectionStart || nextValue.length;
    onChange(nextValue);

    if (nextValue.slice(0, caretIndex).endsWith("@")) {
      openMentionMenu(event.target, caretIndex);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      closeMentionMenu();
      return;
    }

    if (event.key === "@") {
      window.requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) openMentionMenu(textarea, textarea.selectionStart || textarea.value.length);
      });
    }
  }

  function findMediaForMention(input: InsertMentionInput) {
    const mediaId = String(input.mediaId || "").trim();
    if (mediaId) {
      const mediaItem = media.find((item) => item.id === mediaId || item.url === mediaId);
      if (mediaItem) return mediaItem;
    }

    if (input.type && input.index) {
      const mentionItem = mentionItems.find((item) => item.type === input.type && item.index === input.index);
      if (mentionItem) {
        return media.find((item) => item.id === mentionItem.id || item.url === mentionItem.url) || null;
      }
    }

    return null;
  }

  function syncMentionBinding(input: InsertMentionInput, range: ReplaceRange) {
    if (!onMentionBindingsChange) return;

    const mediaItem = findMediaForMention(input);
    if (!mediaItem) return;

    const replacedTokenText = value.slice(range.start, range.end).trim();
    const existingBinding = replacedTokenText ? findMentionBindingForToken(mentionBindings, replacedTokenText, media) : undefined;

    onMentionBindingsChange((current) => {
      const currentExistingBinding = replacedTokenText ? findMentionBindingForToken(current, replacedTokenText, media) : existingBinding;
      const currentExplicitBinding = currentExistingBinding
        ? current.find((binding) => binding.tokenId === currentExistingBinding.tokenId)
        : undefined;
      const existingMediaBinding = current.find((binding) => binding.mediaId === getMediaIdentity(mediaItem));
      const bindingToUpdate = currentExplicitBinding || existingMediaBinding;
      const nextBinding = createMentionBinding(
        { id: mediaItem.id, type: mediaItem.type, url: mediaItem.url },
        input.display,
        {
          createdAt: bindingToUpdate?.createdAt,
          sourceTokenText: input.token || input.display,
          tokenId: bindingToUpdate?.tokenId,
          updatedAt: Date.now(),
        },
      );

      if (bindingToUpdate) {
        const next = current.map((binding) => (binding.tokenId === bindingToUpdate.tokenId ? nextBinding : binding));
        return next.every((binding, index) => sameMentionBinding(binding, current[index])) ? current : next;
      }

      return [...current, nextBinding];
    });
  }

  function insertMentionText(input: InsertMentionInput | string) {
    const mentionInput = typeof input === "string" ? { display: input } : input;
    const textarea = textareaRef.current;
    const currentStart = textarea?.selectionStart ?? value.length;
    const currentEnd = textarea?.selectionEnd ?? value.length;
    const range = replaceRange || findMentionReplaceRange(value, currentStart, currentEnd);
    const before = value.slice(0, range.start);
    const after = value.slice(range.end);
    const trailingSpace = after.length && !/^\s/.test(after) ? " " : "";
    const nextValue = `${before}${mentionInput.display}${trailingSpace}${after}`.slice(0, 1200);
    const nextCaret = Math.min(before.length + mentionInput.display.length + trailingSpace.length, nextValue.length);

    onChange(nextValue);
    syncMentionBinding(mentionInput, range);
    closeMentionMenu();

    window.requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function insertMention(item: MentionableMediaItem) {
    insertMentionText({
      display: item.display,
      index: item.index,
      mediaId: item.id,
      token: item.token,
      type: item.type,
      url: item.url,
    });
  }

  function handleMenuMouseDown(event: ReactMouseEvent) {
    event.preventDefault();
  }

  useEffect(() => {
    function handleExternalMention(event: Event) {
      const detail = (event as CustomEvent<InsertMentionInput>).detail;
      if (!detail?.display) return;
      insertMentionText(detail);
    }

    function handleOpenMentionMenu(event: Event) {
      const detail = (event as CustomEvent<OpenMentionMenuInput>).detail;
      openMentionMenuFromExternal(detail?.anchorEl || null);
    }

    window.addEventListener("shadowedge:insert-video-mention", handleExternalMention);
    window.addEventListener("shadowedge:open-video-mention-menu", handleOpenMentionMenu);
    return () => {
      window.removeEventListener("shadowedge:insert-video-mention", handleExternalMention);
      window.removeEventListener("shadowedge:open-video-mention-menu", handleOpenMentionMenu);
    };
  });

  useEffect(() => {
    if (!isMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target) || textareaRef.current?.contains(target)) return;
      closeMentionMenu();
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", closeMentionMenu, true);
    window.addEventListener("resize", closeMentionMenu);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", closeMentionMenu, true);
      window.removeEventListener("resize", closeMentionMenu);
    };
  }, [isMenuOpen]);

  const menuStyle: CSSProperties = {
    left: menuPosition.left,
    top: menuPosition.top,
  };

  function mentionGroupTitle(type: UploadMediaType) {
    if (type === "image") return t("video.prompt.group.images");
    if (type === "video") return t("video.prompt.group.videos");
    return t("video.prompt.group.audios");
  }

  return (
    <section className="se-card rounded-[22px] p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black text-white">{t("video.prompt.title")}</h2>
        <span className="text-xs font-bold text-white/38">{value.length}/1200</span>
      </div>
      <textarea
        className="se-scrollbar h-36 min-h-32 w-full resize-y rounded-[22px] border border-white/10 bg-[#10141f] p-4 text-sm leading-7 text-white outline-none transition placeholder:text-white/28 focus:border-[#ffb44d]/70"
        maxLength={1200}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={t("video.prompt.placeholder")}
        ref={textareaRef}
        value={value}
      />

      {missingMentions.length ? (
        <p className="mt-3 rounded-2xl border border-[#ffb44d]/25 bg-[#ffb44d]/10 px-3 py-2 text-xs font-semibold text-[#ffd08a]">
          {tf("video.prompt.missingWarning", { items: missingMentions.map((mention) => mention.display).join(", ") })}
        </p>
      ) : (
        <p className="mt-3 text-xs text-white/38">{t("video.prompt.helper")}</p>
      )}

      {isMenuOpen ? (
        <div
          className="se-scrollbar fixed z-[80] max-h-[320px] w-[286px] overflow-y-auto rounded-2xl border border-[#ffb44d]/22 bg-[#0f141e]/98 p-1.5 shadow-[0_18px_46px_rgba(0,0,0,.38)] backdrop-blur-xl"
          onMouseDown={handleMenuMouseDown}
          ref={menuRef}
          style={menuStyle}
        >
          {mentionItems.length ? (
            mentionGroups.map((type) => {
              const groupItems = mentionItems.filter((item) => item.type === type);
              if (!groupItems.length) return null;

              return (
                <div className="grid gap-1 py-0.5" key={type}>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-white/38">
                    {mentionGroupTitle(type)}
                  </div>
                  {groupItems.map((item) => (
                    <button
                      className="flex min-h-10 w-full items-center gap-2.5 rounded-xl border border-transparent px-2 py-1.5 text-left transition hover:border-[#ffb44d]/26 hover:bg-[#ffb44d]/9 focus:border-[#ffb44d]/32 focus:bg-[#ffb44d]/10 focus:outline-none"
                      key={`${item.type}-${item.index}-${item.id}`}
                      onClick={() => insertMention(item)}
                      type="button"
                    >
                      {item.type === "image" && item.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="size-9 rounded-lg object-cover" src={item.previewUrl} />
                      ) : (
                        <span className="grid size-9 place-items-center rounded-lg border border-white/10 bg-[#ffb44d]/10 text-[#ffd08a]/78">
                          <MediaTypeIcon className="size-[18px]" type={item.type} />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block text-[12px] font-semibold leading-4 text-white/90">{item.display}</span>
                        <span className="mt-0.5 block truncate text-[10px] leading-3 text-white/38">{item.title}</span>
                      </span>
                    </button>
                  ))}
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[.045] px-3 py-3 text-xs leading-5 text-white/50">
              {t("video.prompt.mentionEmpty")}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

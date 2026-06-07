"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import {
  findPromptMentions,
  getMissingPromptMentions,
  getReadyMentionableMediaItems,
  type MentionableMediaItem,
} from "@/lib/video-mentions";
import type { UploadMediaItem, UploadMediaType } from "@/types/video";

type PromptBoxProps = {
  value: string;
  media: UploadMediaItem[];
  onChange: (value: string) => void;
};

type ReplaceRange = {
  start: number;
  end: number;
};

type MenuPosition = {
  left: number;
  top: number;
};

const mentionGroups: Array<[UploadMediaType, string]> = [
  ["image", "Images"],
  ["video", "Videos"],
  ["audio", "Audio"],
];

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

function mediaIcon(type: UploadMediaType) {
  if (type === "audio") return "AUD";
  if (type === "video") return "VID";
  return "IMG";
}

export function PromptBox({ value, media, onChange }: PromptBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ left: 0, top: 0 });
  const [replaceRange, setReplaceRange] = useState<ReplaceRange | null>(null);

  const mentionItems = useMemo(() => getReadyMentionableMediaItems(media), [media]);
  const missingMentions = useMemo(() => getMissingPromptMentions(value, media), [media, value]);

  function openMentionMenu(textarea: HTMLTextAreaElement, caretIndex: number) {
    setReplaceRange(findMentionReplaceRange(textarea.value, textarea.selectionStart || caretIndex, textarea.selectionEnd || caretIndex));
    setMenuPosition(getTextareaCaretClientPosition(textarea, caretIndex));
    setIsMenuOpen(true);
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

  function insertMentionText(display: string) {
    const textarea = textareaRef.current;
    const currentStart = textarea?.selectionStart ?? value.length;
    const currentEnd = textarea?.selectionEnd ?? value.length;
    const range = replaceRange || findMentionReplaceRange(value, currentStart, currentEnd);
    const before = value.slice(0, range.start);
    const after = value.slice(range.end);
    const trailingSpace = after.length && !/^\s/.test(after) ? " " : "";
    const nextValue = `${before}${display}${trailingSpace}${after}`.slice(0, 1200);
    const nextCaret = Math.min(before.length + display.length + trailingSpace.length, nextValue.length);

    onChange(nextValue);
    closeMentionMenu();

    window.requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function insertMention(item: MentionableMediaItem) {
    insertMentionText(item.display);
  }

  function handleMenuMouseDown(event: ReactMouseEvent) {
    event.preventDefault();
  }

  useEffect(() => {
    function handleExternalMention(event: Event) {
      const detail = (event as CustomEvent<{ display?: string }>).detail;
      if (!detail?.display) return;
      insertMentionText(detail.display);
    }

    window.addEventListener("shadowedge:insert-video-mention", handleExternalMention);
    return () => window.removeEventListener("shadowedge:insert-video-mention", handleExternalMention);
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

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[.055] p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black text-white">Prompt</h2>
        <span className="text-xs font-bold text-white/38">{value.length}/1200</span>
      </div>
      <textarea
        className="se-scrollbar h-40 min-h-36 w-full resize-y rounded-[22px] border border-white/10 bg-[#10141f] p-4 text-sm leading-7 text-white outline-none transition placeholder:text-white/28 focus:border-[#ffb44d]/70"
        maxLength={1200}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Describe the video, camera motion, scene, style, references, and final mood. Type @ to reference uploaded media..."
        ref={textareaRef}
        value={value}
      />

      {missingMentions.length ? (
        <p className="mt-3 rounded-2xl border border-[#ffb44d]/25 bg-[#ffb44d]/10 px-3 py-2 text-xs font-semibold text-[#ffd08a]">
          Prompt references missing media: {missingMentions.map((mention) => mention.display).join(", ")}
        </p>
      ) : (
        <p className="mt-3 text-xs text-white/38">Type @ to insert @图1, @视频1, or @音频1 from uploaded ready media.</p>
      )}

      {isMenuOpen ? (
        <div
          className="se-scrollbar fixed z-[80] max-h-[340px] w-[300px] overflow-y-auto rounded-2xl border border-[#4989ff]/30 bg-[#0f141e]/98 p-2 shadow-[0_18px_46px_rgba(0,0,0,.38)] backdrop-blur-xl"
          onMouseDown={handleMenuMouseDown}
          ref={menuRef}
          style={menuStyle}
        >
          {mentionItems.length ? (
            mentionGroups.map(([type, title]) => {
              const groupItems = mentionItems.filter((item) => item.type === type);
              if (!groupItems.length) return null;

              return (
                <div className="grid gap-1.5 py-1" key={type}>
                  <div className="px-2 py-1 text-[11px] font-black uppercase tracking-[.14em] text-white/44">{title}</div>
                  {groupItems.map((item) => (
                    <button
                      className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-[#ffb44d]/28 hover:bg-[#ffb44d]/10 focus:border-[#ffb44d]/34 focus:bg-[#ffb44d]/12 focus:outline-none"
                      key={`${item.type}-${item.index}-${item.id}`}
                      onClick={() => insertMention(item)}
                      type="button"
                    >
                      {item.type === "image" && item.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="h-11 w-11 rounded-lg object-cover" src={item.previewUrl} />
                      ) : (
                        <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#4989ff]/16 text-[11px] font-black text-[#9cc2ff]">
                          {mediaIcon(item.type)}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-white">{item.display}</span>
                        <span className="mt-0.5 block truncate text-xs text-white/45">{item.title}</span>
                      </span>
                    </button>
                  ))}
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[.045] px-3 py-4 text-sm text-white/55">
              Upload ready image, video, or audio media before using @ references.
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

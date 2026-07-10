"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { MediaTypeIcon } from "@/components/video/MediaTypeIcon";
import { RichPromptEditor } from "@/components/video/RichPromptEditor";
import type { RichPromptMenuRequest } from "@/lib/video-rich-prompt";
import {
  findPromptMentions,
  getReferencePromptBindings,
  getReadyMentionableMediaItems,
  type MentionableMediaItem,
  type ReferencePromptBinding,
} from "@/lib/video-mentions";
import {
  createMentionBinding,
  findMentionBindingForToken,
  type VideoMentionBinding,
} from "@/lib/video/videoMentionBindings";
import { normalizeMediaAssetUrl, sanitizeMediaDisplayName } from "@/lib/media-assets";
import {
  VIDEO_PROMPT_FRONTEND_LIMIT,
  VIDEO_PROMPT_FRONTEND_LIMIT_LABEL,
  VIDEO_PROMPT_WARNING_THRESHOLD,
} from "@/lib/video/videoPromptLimits";
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

type PromptEditorId = "expand" | "main";

type ActiveReplaceRange = ReplaceRange & {
  editorId: PromptEditorId;
  promptValue: string;
};

type MenuPosition = {
  left: number;
  maxHeight: number;
  mode: "fixed" | "local";
  top: number;
  width: number;
};

type MenuAnchorRect = {
  bottom: number;
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
const menuSafeGap = 12;
const menuDesktopMaxHeight = 420;
const menuMobileMaxHeight = 360;
const menuMaxWidth = 340;
const menuMinWidth = 286;
const defaultMenuPosition: MenuPosition = { left: 0, maxHeight: 360, mode: "fixed", top: 0, width: menuMinWidth };

function getFixedMentionMenuPosition(anchor: Pick<DOMRect, "bottom" | "left" | "top">): MenuPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobile = viewportWidth < 640;
  const width = Math.min(menuMaxWidth, Math.max(menuMinWidth, viewportWidth - menuSafeGap * 2));
  const desiredMaxHeight = Math.min(isMobile ? menuMobileMaxHeight : menuDesktopMaxHeight, viewportHeight - menuSafeGap * 2);
  const belowTop = anchor.bottom + 8;
  const aboveBottom = anchor.top - 8;
  const belowSpace = viewportHeight - menuSafeGap - belowTop;
  const aboveSpace = aboveBottom - menuSafeGap;
  const shouldOpenUp = belowSpace < Math.min(240, desiredMaxHeight) && aboveSpace > belowSpace;
  const availableHeight = Math.max(160, shouldOpenUp ? aboveSpace : belowSpace);
  const maxHeight = Math.min(desiredMaxHeight, availableHeight);
  const rawTop = shouldOpenUp ? aboveBottom - maxHeight : belowTop;

  return {
    left: Math.max(menuSafeGap, Math.min(anchor.left, viewportWidth - width - menuSafeGap)),
    maxHeight,
    mode: "fixed",
    top: Math.max(menuSafeGap, Math.min(rawTop, viewportHeight - maxHeight - menuSafeGap)),
    width,
  };
}

function getLocalMentionMenuPosition(anchor: Pick<DOMRect, "bottom" | "left" | "top">, container: HTMLElement): MenuPosition {
  const containerRect = container.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const containerWidth = Math.max(menuMinWidth + 16, containerRect.width);
  const width = Math.min(menuMaxWidth, Math.max(menuMinWidth, containerWidth - 16));
  const localLeft = anchor.left - containerRect.left;
  const availableBelow = Math.max(140, viewportHeight - anchor.bottom - menuSafeGap);

  return {
    left: Math.max(8, Math.min(localLeft, containerWidth - width - 8)),
    maxHeight: Math.min(menuDesktopMaxHeight, availableBelow),
    mode: "local",
    top: Math.max(8, anchor.bottom - containerRect.top + 8),
    width,
  };
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
  const activeAtMention = beforeCaret.match(/@(图片|图|视频|音频|Image|Video|Audio)?\s*\d*$/iu);

  if (activeAtMention) {
    return {
      start: selectionStart - activeAtMention[0].length,
      end: selectionEnd,
    };
  }

  return { start: selectionStart, end: selectionEnd };
}

function expandActiveMentionRange(prompt: string, range: ReplaceRange): ReplaceRange {
  const source = String(prompt || "");
  const start = Math.max(0, Math.min(range.start, source.length));
  const end = Math.max(start, Math.min(range.end, source.length));
  const selectedMention = findPromptMentions(source).find((mention) => start < mention.end && end > mention.start);

  if (selectedMention) {
    return {
      start: selectedMention.start,
      end: selectedMention.end,
    };
  }

  const activeMention = source
    .slice(start)
    .match(/^@(?:\u56fe\u7247|\u56fe|\u89c6\u9891|\u97f3\u9891|Image|Video|Audio)?\s*\d*/iu);

  if (activeMention?.[0]) {
    return {
      start,
      end: start + activeMention[0].length,
    };
  }

  return { start, end };
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
  const { locale, t, tf } = useI18n();
  const displayLocale = locale === "zh" ? "zh" : "en";
  const editorRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuAnchorRef = useRef<HTMLElement | null>(null);
  const menuAnchorRectRef = useRef<MenuAnchorRect | null>(null);
  const menuCaretIndexRef = useRef<number | null>(null);
  const menuEditorIdRef = useRef<PromptEditorId>("main");
  const menuRafRef = useRef<number | null>(null);
  const menuSelectionLockRef = useRef(false);
  const latestPromptValueRef = useRef(value);
  const expandedEditorRef = useRef<HTMLDivElement | null>(null);
  const replaceRangeRef = useRef<ActiveReplaceRange | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExpandedEditorOpen, setIsExpandedEditorOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>(defaultMenuPosition);
  const [menuPortalTarget, setMenuPortalTarget] = useState<HTMLElement | null>(null);
  const [replaceRange, setReplaceRange] = useState<ActiveReplaceRange | null>(null);

  const mentionItems = useMemo(() => getReadyMentionableMediaItems(media), [media]);
  const referenceBindings = useMemo(
    () => getReferencePromptBindings(value, mentionItems, mentionBindings),
    [mentionBindings, mentionItems, value],
  );
  const missingMentions = useMemo(
    () => getMissingMentionsWithBindings(value, media, mentionBindings),
    [media, mentionBindings, value],
  );

  useEffect(() => {
    latestPromptValueRef.current = value;
  }, [value]);

  const setActiveReplaceRange = useCallback((range: ActiveReplaceRange | null) => {
    replaceRangeRef.current = range;
    setReplaceRange(range);
  }, []);

  function getEditorById(editorId: PromptEditorId) {
    return editorId === "expand" ? expandedEditorRef.current : editorRef.current;
  }

  function getEditorIdForEditor(editor: HTMLElement | null): PromptEditorId {
    if (editor && expandedEditorRef.current && editor === expandedEditorRef.current) return "expand";
    return "main";
  }

  function editorOwnsSelection(editor: HTMLElement | null) {
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return false;
    return editor.contains(selection.getRangeAt(0).startContainer);
  }

  function getActiveReplaceRange(range: ReplaceRange, editorId: PromptEditorId, promptValue = latestPromptValueRef.current): ActiveReplaceRange {
    return {
      ...range,
      editorId,
      promptValue,
    };
  }

  function openEditorLocalMentionMenu(anchor: Pick<DOMRect, "bottom" | "left" | "top">, editor: HTMLElement, range: ReplaceRange, anchorEl?: HTMLElement | null, editorId = getEditorIdForEditor(editor), promptValue?: string) {
    const container = editor.parentElement;
    if (!container) return false;
    if (isExpandedEditorOpen && editorId === "main" && editorOwnsSelection(expandedEditorRef.current)) return false;
    menuAnchorRef.current = anchorEl || null;
    menuAnchorRectRef.current = anchor;
    menuEditorIdRef.current = editorId;
    menuCaretIndexRef.current = range.end;
    if (promptValue) latestPromptValueRef.current = promptValue;
    setActiveReplaceRange(getActiveReplaceRange(range, editorId, promptValue));
    setMenuPortalTarget(container);
    setMenuPosition(getLocalMentionMenuPosition(anchor, container));
    setIsMenuOpen(true);
    return true;
  }

  function openFixedMentionMenu(anchor: Pick<DOMRect, "bottom" | "left" | "top">, range: ReplaceRange, anchorEl?: HTMLElement | null, editorId: PromptEditorId = isExpandedEditorOpen ? "expand" : "main", promptValue?: string) {
    menuAnchorRef.current = anchorEl || null;
    menuAnchorRectRef.current = null;
    menuEditorIdRef.current = editorId;
    menuCaretIndexRef.current = range.end;
    if (promptValue) latestPromptValueRef.current = promptValue;
    setActiveReplaceRange(getActiveReplaceRange(range, editorId, promptValue));
    setMenuPortalTarget(typeof document === "undefined" ? null : document.body);
    setMenuPosition(getFixedMentionMenuPosition(anchor));
    setIsMenuOpen(true);
  }

  function getEditorForAnchor(anchorEl: HTMLElement) {
    if (anchorEl.getAttribute("contenteditable") === "true") return anchorEl;
    return anchorEl.closest("[contenteditable='true']") as HTMLElement | null;
  }

  function openRichMentionMenu({ anchorEl, anchorRect, editorId, promptValue, range }: RichPromptMenuRequest) {
    const editor = getEditorForAnchor(anchorEl);
    const targetEditorId = (editorId === "expand" || editorId === "main")
      ? editorId
      : editor
        ? getEditorIdForEditor(editor)
        : isExpandedEditorOpen
          ? "expand"
          : "main";
    const anchor = anchorRect || anchorEl.getBoundingClientRect();
    if (editor && openEditorLocalMentionMenu(anchor, editor, range, anchorEl === editor ? null : anchorEl, targetEditorId, promptValue)) return;
    openFixedMentionMenu(anchor, range, anchorEl, targetEditorId, promptValue);
  }

  function openMentionMenuFromExternal(anchorEl?: HTMLElement | null) {
    const editor = editorRef.current;
    const selectionStart = value.length;
    const selectionEnd = selectionStart;
    const range = findMentionReplaceRange(value, selectionStart, selectionEnd);

    if (anchorEl) {
      openFixedMentionMenu(anchorEl.getBoundingClientRect(), range, anchorEl, "main");
    } else if (editor) {
      const rect = editor.getBoundingClientRect();
      openEditorLocalMentionMenu({ bottom: rect.top + 44, left: rect.left + 18, top: rect.top + 24 }, editor, range, undefined, "main");
    } else {
      openFixedMentionMenu({ bottom: 88, left: 18, top: 76 }, range, undefined, "main");
    }

    window.requestAnimationFrame(() => {
      editorRef.current?.focus();
    });
  }

  const closeMentionMenu = useCallback(() => {
    setIsMenuOpen(false);
    setActiveReplaceRange(null);
    menuAnchorRef.current = null;
    menuAnchorRectRef.current = null;
    setMenuPortalTarget(null);
    menuCaretIndexRef.current = null;
    menuEditorIdRef.current = "main";
  }, [setActiveReplaceRange]);

  function openExpandedEditor() {
    closeMentionMenu();
    setIsExpandedEditorOpen(true);
  }

  const closeExpandedEditor = useCallback(() => {
    closeMentionMenu();
    setIsExpandedEditorOpen(false);
    window.requestAnimationFrame(() => {
      editorRef.current?.focus();
    });
  }, [closeMentionMenu]);

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

  function syncMentionBinding(input: InsertMentionInput, range: ReplaceRange, promptValue = latestPromptValueRef.current) {
    if (!onMentionBindingsChange) return;

    const mediaItem = findMediaForMention(input);
    if (!mediaItem) return;

    const replacedTokenText = promptValue.slice(range.start, range.end).trim();
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
    const activeRange = replaceRangeRef.current || replaceRange;
    const editorId = activeRange?.editorId || menuEditorIdRef.current || (isExpandedEditorOpen ? "expand" : "main");
    const editor = getEditorById(editorId);
    const activePromptValue = activeRange?.editorId === editorId ? activeRange.promptValue : "";
    const promptValue = latestPromptValueRef.current.length >= activePromptValue.length
      ? latestPromptValueRef.current
      : activePromptValue;
    const currentStart = menuCaretIndexRef.current ?? activeRange?.end ?? promptValue.length;
    const currentEnd = currentStart;
    const savedRange = activeRange?.editorId === editorId
      ? expandActiveMentionRange(promptValue, { start: activeRange.start, end: activeRange.end })
      : findMentionReplaceRange(promptValue, currentStart, currentEnd);
    const liveRange = findMentionReplaceRange(promptValue, currentStart, currentEnd);
    const range = liveRange.start <= savedRange.start && liveRange.end >= savedRange.end ? liveRange : savedRange;
    const before = promptValue.slice(0, range.start);
    const after = promptValue.slice(range.end);
    const trailingSpace = after.length && !/^\s/.test(after) ? " " : "";
    const nextValue = `${before}${mentionInput.display}${trailingSpace}${after}`;
    const nextCaret = Math.min(before.length + mentionInput.display.length + trailingSpace.length, nextValue.length);

    latestPromptValueRef.current = nextValue;
    onChange(nextValue);
    syncMentionBinding(mentionInput, range, promptValue);
    closeMentionMenu();

    window.requestAnimationFrame(() => {
      if (!editor) return;
      editor.focus();
      menuCaretIndexRef.current = nextCaret;
      window.requestAnimationFrame(() => {
        editor.dispatchEvent(new CustomEvent("shadowedge:set-rich-prompt-caret", { detail: { offset: nextCaret } }));
      });
    });
  }

  function insertMention(item: MentionableMediaItem) {
    insertMentionText({
      display: item.token,
      index: item.index,
      mediaId: item.id,
      token: item.token,
      type: item.type,
      url: item.url,
    });
  }

  function handleReferenceBindingClick(binding: ReferencePromptBinding, anchorEl: HTMLElement) {
    if (binding.mention) {
      const editorId: PromptEditorId = isExpandedEditorOpen ? "expand" : "main";
      const editor = isExpandedEditorOpen ? expandedEditorRef.current : editorRef.current;
      editor?.focus();
      setActiveReplaceRange(getActiveReplaceRange({ start: binding.mention.start, end: binding.mention.end }, editorId));
      openRichMentionMenu({ anchorEl, editorId, range: { start: binding.mention.start, end: binding.mention.end } });
      return;
    }

    insertMentionText({
      display: binding.token,
      index: binding.index,
      mediaId: binding.id,
      token: binding.token,
      type: binding.type,
      url: binding.url,
    });
  }

  function handleMenuMouseDown(event: ReactMouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleMenuItemPointerDown(event: ReactPointerEvent, item: MentionableMediaItem) {
    event.preventDefault();
    event.stopPropagation();
    selectMentionItem(item);
  }

  function handleMenuItemMouseDown(event: ReactMouseEvent, item: MentionableMediaItem) {
    event.preventDefault();
    event.stopPropagation();
    selectMentionItem(item);
  }

  function handleMenuItemClick(event: ReactMouseEvent, item: MentionableMediaItem) {
    event.preventDefault();
    event.stopPropagation();
    if (event.detail === 0) {
      selectMentionItem(item);
    }
  }

  function selectMentionItem(item: MentionableMediaItem) {
    if (menuSelectionLockRef.current) return;
    menuSelectionLockRef.current = true;
    insertMention(item);
    window.setTimeout(() => {
      menuSelectionLockRef.current = false;
    }, 250);
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
    if (!isExpandedEditorOpen) return;

    window.requestAnimationFrame(() => {
      expandedEditorRef.current?.focus();
    });

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" || event.key === "Esc" || event.key === "ESC") {
        if (isMenuOpen) {
          closeMentionMenu();
          return;
        }
        closeExpandedEditor();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeExpandedEditor, closeMentionMenu, isExpandedEditorOpen, isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;

    function isRectVisible(rect: DOMRect) {
      return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
    }

    function updateMenuPosition() {
      if (menuPosition.mode === "local") {
        closeMentionMenu();
        return;
      }

      const anchor = menuAnchorRef.current;
      if (anchor?.isConnected) {
        const rect = anchor.getBoundingClientRect();
        if (!isRectVisible(rect)) {
          closeMentionMenu();
          return;
        }
        setMenuPosition(getFixedMentionMenuPosition(rect));
        return;
      }

      if (menuAnchorRectRef.current) {
        closeMentionMenu();
        return;
      }

      const editor = isExpandedEditorOpen ? expandedEditorRef.current : editorRef.current;
      if (!editor) return;

      const rect = editor.getBoundingClientRect();
      if (!isRectVisible(rect)) {
        closeMentionMenu();
        return;
      }

      const caretIndex = menuCaretIndexRef.current ?? value.length;
      menuCaretIndexRef.current = caretIndex;
      setMenuPosition(getFixedMentionMenuPosition(rect));
    }

    function scheduleMenuPositionUpdate() {
      if (menuRafRef.current) window.cancelAnimationFrame(menuRafRef.current);
      menuRafRef.current = window.requestAnimationFrame(() => {
        menuRafRef.current = null;
        updateMenuPosition();
      });
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        menuRef.current?.contains(target) ||
        editorRef.current?.contains(target) ||
        expandedEditorRef.current?.contains(target)
      ) return;
      closeMentionMenu();
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", scheduleMenuPositionUpdate, true);
    window.addEventListener("resize", scheduleMenuPositionUpdate);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", scheduleMenuPositionUpdate, true);
      window.removeEventListener("resize", scheduleMenuPositionUpdate);
      if (menuRafRef.current) window.cancelAnimationFrame(menuRafRef.current);
    };
  }, [closeMentionMenu, isExpandedEditorOpen, isMenuOpen, menuPosition.mode, value]);

  const menuStyle: CSSProperties = {
    left: menuPosition.left,
    maxHeight: menuPosition.maxHeight,
    top: menuPosition.top,
    width: menuPosition.width,
  };
  const menuClassName = [
    "se-scrollbar max-w-[calc(100vw-24px)] touch-pan-y overscroll-contain overflow-y-auto rounded-2xl border border-[#ffb44d]/22",
    "bg-[#0f141e]/98 p-1.5 shadow-[0_18px_46px_rgba(0,0,0,.38)] backdrop-blur-xl",
    menuPosition.mode === "local" ? "absolute z-[40]" : "fixed z-[1400]",
  ].join(" ");
  const promptLength = value.length;
  const isPromptTooLong = promptLength > VIDEO_PROMPT_FRONTEND_LIMIT;
  const isPromptNearLimit = promptLength >= VIDEO_PROMPT_WARNING_THRESHOLD;

  function mentionGroupTitle(type: UploadMediaType) {
    if (type === "image") return t("video.prompt.group.images");
    if (type === "video") return t("video.prompt.group.videos");
    return t("video.prompt.group.audios");
  }

  function fallbackDisplayToken(type: UploadMediaType, index: number) {
    if (type === "video") return `@Video ${index}`;
    if (type === "audio") return `@Audio ${index}`;
    return `@Image ${index}`;
  }

  function renderReferenceBindings(compact = false) {
    if (!referenceBindings.length) return null;

    return (
      <div
        className={`rounded-[20px] border border-white/10 bg-white/[.045] ${
          compact ? "mt-3 px-3 py-2" : "mt-3 px-3.5 py-3"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[.14em] text-[#ffd08a]/78">
            {t("video.prompt.referenceBindings")}
          </span>
          <span className="text-[11px] font-semibold text-white/42">{t("video.prompt.referenceBindingHint")}</span>
        </div>
        <div className="se-subtle-scrollbar mt-2 flex max-w-full gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {referenceBindings.map((binding) => {
            const itemTitle = sanitizeMediaDisplayName({
              index: Math.max(0, binding.index - 1),
              locale: displayLocale,
              rawName: binding.label || binding.fallbackLabel || binding.title,
              type: binding.type,
            });
            const previewUrl = normalizeMediaAssetUrl(binding.previewUrl);
            const displayToken = binding.displayToken || fallbackDisplayToken(binding.type, binding.index);
            const localizedToken = binding.localizedToken || binding.display || "";
            const canonicalToken = binding.canonicalToken || binding.token;

            return (
              <button
                className="group inline-flex min-h-9 max-w-[260px] shrink-0 items-center gap-1.5 rounded-full border border-[#ffb44d]/24 bg-[#0b0d12]/62 px-1.5 py-1 text-left text-[11px] font-semibold text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] transition hover:border-[#ffb44d]/44 hover:bg-[#ffb44d]/10 focus:border-[#ffb44d]/64 focus:outline-none"
                key={`${binding.type}-${binding.index}-${binding.id}`}
                onClick={(event) => handleReferenceBindingClick(binding, event.currentTarget)}
                title={`${displayToken} · ${itemTitle} · ${canonicalToken}`}
                type="button"
              >
                {binding.type === "image" && previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="size-5 shrink-0 rounded-full object-cover ring-1 ring-white/12" src={previewUrl} />
                ) : (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#ffb44d]/14 text-[#ffcf92] ring-1 ring-[#ffb44d]/18">
                    <MediaTypeIcon className="size-3" type={binding.type} />
                  </span>
                )}
                <span className="shrink-0 font-black text-[#ffd08a]">
                  {displayToken}
                </span>
                <span className="shrink-0 text-white/28">·</span>
                <span className="min-w-0 truncate text-white/72">{itemTitle}</span>
                {localizedToken && localizedToken !== displayToken ? (
                  <span className="hidden shrink-0 rounded-full bg-[#05070b]/34 px-1.5 py-px text-[10px] text-white/38 sm:inline">
                    {localizedToken}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs leading-5 text-white/38">{t("video.prompt.complexPromptHint")}</p>
      </div>
    );
  }

  return (
    <section className="se-card rounded-[24px] p-3.5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#f4f4f4]">{t("video.prompt.title")}</h2>
        <div className="flex shrink-0 items-center gap-2">
          <button
            aria-label={t("video.prompt.expand")}
            className="rounded-full border border-[#ffb44d]/22 bg-[#ffb44d]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ffd08a]/82 transition hover:border-[#ffb44d]/36 hover:bg-[#ffb44d]/16 hover:text-[#ffe0a3] focus:border-[#ffb44d]/50 focus:outline-none"
            onClick={openExpandedEditor}
            type="button"
          >
            {t("video.prompt.expand")}
          </button>
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              isPromptTooLong
                ? "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#fecaca]"
                : isPromptNearLimit
                  ? "border-[#ffb44d]/26 bg-[#ffb44d]/10 text-[#ffd08a]"
                  : "border-[rgba(244,244,244,0.08)] bg-[#05070b]/30 text-[#b9b9b9]/50"
            }`}
          >
            {tf("video.prompt.characterCount", { count: promptLength, limit: VIDEO_PROMPT_FRONTEND_LIMIT })}
          </span>
        </div>
      </div>
      <RichPromptEditor
        className="se-scrollbar h-[180px] min-h-[160px] w-full resize-y overflow-auto rounded-[24px] border border-white/10 bg-[#10141f]/92 px-4 py-3.5 text-sm leading-7 text-white outline-none transition placeholder:text-white/28 focus:border-[#ffb44d]/70 md:h-[220px] md:min-h-[210px]"
        editorId="main"
        onChange={onChange}
        onDismissMentionMenu={closeMentionMenu}
        onEscape={closeMentionMenu}
        onRequestMentionMenu={openRichMentionMenu}
        placeholder={t("video.prompt.placeholder")}
        ref={editorRef}
        value={value}
      />
      {renderReferenceBindings()}

      <div className="mt-3 grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs leading-5 text-white/42">
          <span>{t("video.prompt.longPromptSupported")}</span>
          <span className="rounded-full border border-[#ffb44d]/18 bg-[#ffb44d]/7 px-2.5 py-1 font-semibold text-[#ffd08a]/72">
            {t("video.prompt.resizeHint")}
          </span>
        </div>
        {isPromptTooLong ? (
          <p className="text-xs font-semibold leading-5 text-[#fecaca]">
            {tf("video.errors.promptTooLong", { limit: VIDEO_PROMPT_FRONTEND_LIMIT_LABEL })}
          </p>
        ) : isPromptNearLimit ? (
          <p className="text-xs font-semibold leading-5 text-[#ffd08a]/85">
            {t("video.prompt.longPromptWarning")}
          </p>
        ) : null}
      </div>

      {missingMentions.length ? (
        <div className="mt-3 grid max-w-full gap-2 rounded-[18px] border border-[#ffb44d]/24 bg-[#ffb44d]/9 px-3 py-2 text-xs font-semibold leading-5 text-[#ffd08a]/88">
          <div className="inline-flex max-w-full items-start gap-2">
            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-[#ffb44d]/28 bg-[#05070b]/40 text-[10px] leading-none text-[#ffb44d]">
              !
            </span>
            <span className="min-w-0 break-words">
              {tf("video.prompt.missingWarning", { items: missingMentions.map((mention) => mention.display).join(", ") })}
            </span>
          </div>
          <div className="se-subtle-scrollbar flex max-w-full gap-1.5 overflow-x-auto pb-0.5">
            {missingMentions.map((mention) => (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#ffb44d]/28 bg-[#05070b]/36 px-2 py-1 text-[11px] font-black text-[#ffd08a]"
                key={`${mention.type}-${mention.index}-${mention.start}`}
                title={mention.token}
              >
                <span className="grid size-4 place-items-center rounded-full bg-[#ffb44d]/13 text-[#ffb44d]">!</span>
                {fallbackDisplayToken(mention.type, mention.index)}
                <span className="font-semibold text-[#ffd08a]/55">{mention.display}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-white/38">{t("video.prompt.helper")}</p>
      )}

      {isMenuOpen && menuPortalTarget ? createPortal(
        <div
          className={menuClassName}
          data-video-mention-menu="true"
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
                  {groupItems.map((item) => {
                    const previewUrl = normalizeMediaAssetUrl(item.previewUrl);
                    const itemTitle = sanitizeMediaDisplayName({
                      index: Math.max(0, item.index - 1),
                      locale: displayLocale,
                      rawName: item.title,
                      type: item.type,
                    });
                    const displayToken = item.displayToken || fallbackDisplayToken(item.type, item.index);

                    return (
                      <button
                        className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-transparent px-2 py-1.5 text-left transition hover:border-[#ffb44d]/28 hover:bg-[#ffb44d]/8 focus:border-[#ffb44d]/40 focus:bg-[#ffb44d]/10 focus:outline-none"
                        key={`${item.type}-${item.index}-${item.id}`}
                        onClick={(event) => handleMenuItemClick(event, item)}
                        onMouseDown={(event) => handleMenuItemMouseDown(event, item)}
                        onPointerDown={(event) => handleMenuItemPointerDown(event, item)}
                        title={`${displayToken} · ${item.display} · ${item.token}`}
                        type="button"
                      >
                        {item.type === "image" && previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" className="size-9 rounded-xl object-cover ring-1 ring-white/10" src={previewUrl} />
                        ) : (
                          <span className="grid size-9 place-items-center rounded-xl border border-[#ffb44d]/18 bg-[#ffb44d]/10 text-[#ffcf92]">
                            <MediaTypeIcon className="size-[18px]" type={item.type} />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block text-[12px] font-black leading-4 text-[#ffd08a]">{displayToken}</span>
                          <span className="mt-0.5 block truncate text-[10px] leading-3 text-white/45">
                            {item.display} · {itemTitle}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[.045] px-3 py-3 text-xs leading-5 text-white/50">
              {t("video.prompt.mentionEmpty")}
            </div>
          )}
        </div>
        , menuPortalTarget) : null}
      {isExpandedEditorOpen ? createPortal(
        <div
          aria-labelledby="video-prompt-expanded-title"
          aria-modal="true"
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/64 p-3 backdrop-blur-md sm:p-6"
          role="dialog"
        >
          <div className="flex h-[88dvh] max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] max-w-[1040px] flex-col overflow-hidden rounded-[28px] border border-[#ffb44d]/24 bg-[#10141f]/98 shadow-[0_28px_90px_rgba(0,0,0,.58)] sm:h-[72dvh] sm:max-h-[calc(100dvh-48px)] sm:w-[70vw] lg:w-[62vw]">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5 sm:px-5">
              <div className="min-w-0">
                <h3 className="text-base font-black text-white" id="video-prompt-expanded-title">
                  {t("video.prompt.editorTitle")}
                </h3>
                <p className="mt-1 text-xs leading-5 text-white/48">{t("video.prompt.editorSubtitle")}</p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  isPromptTooLong
                    ? "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#fecaca]"
                    : isPromptNearLimit
                      ? "border-[#ffb44d]/26 bg-[#ffb44d]/10 text-[#ffd08a]"
                      : "border-white/10 bg-white/[.04] text-white/48"
                }`}
              >
                {tf("video.prompt.characterCount", { count: promptLength, limit: VIDEO_PROMPT_FRONTEND_LIMIT })}
              </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
              {renderReferenceBindings(true)}
              <RichPromptEditor
                className="se-scrollbar h-full min-h-0 overflow-y-auto rounded-[22px] border border-white/10 bg-[#05070b]/72 px-4 py-3.5 text-sm leading-7 text-white outline-none transition placeholder:text-white/28 focus:border-[#ffb44d]/70"
                editorId="expand"
                onChange={onChange}
                onDismissMentionMenu={closeMentionMenu}
                onEscape={isMenuOpen ? closeMentionMenu : closeExpandedEditor}
                onRequestMentionMenu={openRichMentionMenu}
                placeholder={t("video.prompt.placeholder")}
                ref={expandedEditorRef}
                value={value}
                wrapperClassName="mt-3 min-h-0 flex-1"
              />
              <p className="mt-2 text-xs leading-5 text-white/44">{t("video.prompt.editorHelper")}</p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3 sm:px-5">
              <button
                className="min-h-10 rounded-full border border-[#ffb44d]/28 bg-[#ffb44d]/14 px-4 text-sm font-semibold text-[#ffe0a3] transition hover:bg-[#ffb44d]/20 focus:border-[#ffb44d]/50 focus:outline-none"
                onClick={closeExpandedEditor}
                type="button"
              >
                {t("video.prompt.editorDone")}
              </button>
            </div>
          </div>
        </div>
        , document.body) : null}
    </section>
  );
}

"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  findActiveMentionRange,
  parsePromptTextToRichNodes,
  type RichPromptMenuRequest,
} from "@/lib/video-rich-prompt";
import { findPromptMentions } from "@/lib/video-mentions";

type RichPromptEditorProps = {
  className?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onEscape?: () => void;
  onRequestMentionMenu?: (request: RichPromptMenuRequest) => void;
  placeholder?: string;
  value: string;
};

function isReferenceTokenElement(node: Node | null) {
  return node instanceof HTMLElement && node.dataset.referenceToken === "true";
}

function serializeEditorNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (!(node instanceof HTMLElement)) return "";

  if (isReferenceTokenElement(node)) {
    return node.dataset.canonicalToken || "";
  }

  if (node.tagName === "BR") return "\n";

  let text = "";
  node.childNodes.forEach((child) => {
    text += serializeEditorNode(child);
  });

  if ((node.tagName === "DIV" || node.tagName === "P") && text && !text.endsWith("\n")) {
    text += "\n";
  }

  return text;
}

function serializeEditorElement(root: HTMLElement | null) {
  if (!root) return "";
  let text = "";
  root.childNodes.forEach((child) => {
    text += serializeEditorNode(child);
  });
  return text.replace(/\n$/, "");
}

function getNodeTextLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent || "").length;
  if (!(node instanceof HTMLElement)) return 0;
  if (isReferenceTokenElement(node)) return (node.dataset.canonicalToken || "").length;
  if (node.tagName === "BR") return 1;

  let length = 0;
  node.childNodes.forEach((child) => {
    length += getNodeTextLength(child);
  });
  return length;
}

function getSelectionOffset(root: HTMLElement | null) {
  const selection = window.getSelection();
  if (!root || !selection || selection.rangeCount === 0) return 0;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return serializeEditorElement(root).length;

  let offset = 0;
  let found = false;

  function walk(node: Node) {
    if (found) return;
    if (node === range.startContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += range.startOffset;
      } else {
        const children = Array.from(node.childNodes).slice(0, range.startOffset);
        children.forEach((child) => {
          offset += getNodeTextLength(child);
        });
      }
      found = true;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE || isReferenceTokenElement(node)) {
      offset += getNodeTextLength(node);
      return;
    }

    node.childNodes.forEach(walk);
  }

  root.childNodes.forEach(walk);
  return offset;
}

function setSelectionOffset(root: HTMLElement | null, targetOffset: number) {
  if (!root) return;
  const safeRoot = root;
  const selection = window.getSelection();
  if (!selection) return;

  let offset = Math.max(0, targetOffset);
  let selectedNode: Node | null = null;
  let selectedOffset = 0;

  function walk(node: Node) {
    if (selectedNode) return;
    const length = getNodeTextLength(node);

    if (node.nodeType === Node.TEXT_NODE) {
      if (offset <= length) {
        selectedNode = node;
        selectedOffset = offset;
      } else {
        offset -= length;
      }
      return;
    }

    if (isReferenceTokenElement(node)) {
      if (offset <= length) {
        const parent: Node = node.parentNode ?? safeRoot;
        selectedNode = parent;
        selectedOffset = Array.from(parent.childNodes).findIndex((child) => child === node) + 1;
      } else {
        offset -= length;
      }
      return;
    }

    node.childNodes.forEach(walk);
  }

  safeRoot.childNodes.forEach(walk);

  const range = document.createRange();
  range.setStart(selectedNode || safeRoot, selectedNode ? selectedOffset : safeRoot.childNodes.length);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function createTokenSpan(node: ReturnType<typeof parsePromptTextToRichNodes>[number]) {
  if (node.type !== "mention") return null;
  const span = document.createElement("span");
  span.contentEditable = "false";
  span.dataset.referenceToken = "true";
  span.dataset.referenceType = node.mediaType;
  span.dataset.referenceIndex = String(node.index);
  span.dataset.canonicalToken = node.canonicalToken;
  span.dataset.localizedToken = node.localizedToken;
  span.dataset.displayToken = node.displayToken;
  span.dataset.beautifulMention = `@${node.mediaType}_${node.index}`;
  span.className = [
    "mx-0.5 inline-flex min-h-7 items-center gap-1 rounded-full border border-[#ffb44d]/30",
    "bg-[#0b0d12]/78 px-2 py-0.5 align-middle text-xs font-black text-[#ffd08a]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,.08)] transition hover:border-[#ffb44d]/55 hover:bg-[#ffb44d]/12",
    "data-[reference-selected=true]:border-[#ffb44d]/70 data-[reference-selected=true]:bg-[#ffb44d]/18",
  ].join(" ");

  const icon = document.createElement("span");
  icon.className = "grid size-4 shrink-0 place-items-center rounded-full bg-[#ffb44d]/14 text-[10px] text-[#ffcf92]";
  icon.textContent = node.mediaType === "video" ? "▶" : node.mediaType === "audio" ? "♪" : "◧";

  const label = document.createElement("span");
  label.textContent = node.displayToken;

  span.append(icon, label);
  return span;
}

function renderPromptValue(root: HTMLElement, value: string) {
  const nodes = parsePromptTextToRichNodes(value);
  const fragment = document.createDocumentFragment();

  nodes.forEach((node) => {
    if (node.type === "text") {
      fragment.append(document.createTextNode(node.text));
      return;
    }

    const tokenSpan = createTokenSpan(node);
    if (tokenSpan) fragment.append(tokenSpan);
  });

  root.replaceChildren(fragment);
}

function findAdjacentToken(root: HTMLElement, direction: "backward" | "forward") {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;

  const container = range.startContainer;
  const offset = range.startOffset;

  if (container.nodeType === Node.TEXT_NODE) {
    if (direction === "backward" && offset > 0) return null;
    if (direction === "forward" && offset < (container.textContent || "").length) return null;
    const sibling = direction === "backward" ? container.previousSibling : container.nextSibling;
    return isReferenceTokenElement(sibling) ? sibling : null;
  }

  if (container instanceof HTMLElement) {
    const index = direction === "backward" ? offset - 1 : offset;
    const candidate = container.childNodes[index] || null;
    return isReferenceTokenElement(candidate) ? candidate : null;
  }

  return null;
}

export const RichPromptEditor = forwardRef<HTMLDivElement, RichPromptEditorProps>(function RichPromptEditor(
  {
    className = "",
    disabled = false,
    onChange,
    onEscape,
    onRequestMentionMenu,
    placeholder,
    value,
  },
  forwardedRef,
) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isComposingRef = useRef(false);
  const isRenderingRef = useRef(false);
  const lastRenderedValueRef = useRef("");

  useImperativeHandle(forwardedRef, () => editorRef.current as HTMLDivElement);

  const syncDomFromValue = useCallback((nextValue: string, keepSelection = false, explicitSelectionOffset?: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    const selectionOffset = keepSelection ? explicitSelectionOffset ?? getSelectionOffset(editor) : nextValue.length;
    isRenderingRef.current = true;
    renderPromptValue(editor, nextValue);
    lastRenderedValueRef.current = nextValue;
    setSelectionOffset(editor, selectionOffset);
    window.queueMicrotask(() => {
      isRenderingRef.current = false;
    });
  }, []);

  function shouldHydrateMentionNodes(editor: HTMLElement, nextValue: string) {
    const mentionCount = findPromptMentions(nextValue).length;
    if (!mentionCount) return false;
    const tokenCount = editor.querySelectorAll("[data-reference-token='true']").length;
    return tokenCount !== mentionCount;
  }

  const syncChangeFromDom = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (isRenderingRef.current) return;
    if (isComposingRef.current) return;
    const nextValue = serializeEditorElement(editor);
    lastRenderedValueRef.current = nextValue;
    const caretOffset = getSelectionOffset(editor);
    onChange(nextValue);

    if (!isComposingRef.current && shouldHydrateMentionNodes(editor, nextValue)) {
      window.requestAnimationFrame(() => {
        syncDomFromValue(nextValue, true, caretOffset);
      });
    }

    const activeRange = findActiveMentionRange(nextValue, caretOffset);
    if (activeRange && onRequestMentionMenu) {
      onRequestMentionMenu({ anchorEl: editor, range: activeRange });
    }
  }, [onChange, onRequestMentionMenu, syncDomFromValue]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const currentValue = serializeEditorElement(editor);
    if (currentValue === value && lastRenderedValueRef.current === value) return;
    syncDomFromValue(value, document.activeElement === editor);
  }, [syncDomFromValue, value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.addEventListener("input", syncChangeFromDom);
    editor.addEventListener("keyup", syncChangeFromDom);
    editor.addEventListener("blur", syncChangeFromDom);
    return () => {
      editor.removeEventListener("input", syncChangeFromDom);
      editor.removeEventListener("keyup", syncChangeFromDom);
      editor.removeEventListener("blur", syncChangeFromDom);
    };
  }, [syncChangeFromDom]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (isRenderingRef.current || isComposingRef.current) return;
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        syncChangeFromDom();
      });
    });
    observer.observe(editor, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [syncChangeFromDom]);

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const token = (event.target as HTMLElement | null)?.closest("[data-reference-token='true']") as HTMLElement | null;
    if (!token || !editorRef.current || !onRequestMentionMenu) return;

    event.preventDefault();
    editorRef.current.querySelectorAll("[data-reference-selected='true']").forEach((node) => {
      if (node instanceof HTMLElement) node.dataset.referenceSelected = "false";
    });
    token.dataset.referenceSelected = "true";

    const canonical = token.dataset.canonicalToken || "";
    let start = 0;
    let found = false;
    editorRef.current.childNodes.forEach((node) => {
      if (found) return;
      if (node === token) {
        found = true;
        return;
      }
      start += getNodeTextLength(node);
    });

    onRequestMentionMenu({
      anchorEl: token,
      range: {
        start,
        end: start + canonical.length,
      },
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onEscape?.();
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      const editor = editorRef.current;
      if (!editor) return;
      const token = findAdjacentToken(editor, event.key === "Backspace" ? "backward" : "forward");
      if (!token) return;
      event.preventDefault();
      token.remove();
      syncChangeFromDom();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    window.requestAnimationFrame(syncChangeFromDom);
  }

  return (
    <div className="relative">
      <div
        aria-label={placeholder}
        className={`${className} empty:before:pointer-events-none empty:before:text-white/28 empty:before:content-[attr(data-placeholder)]`}
        contentEditable={!disabled}
        data-placeholder={placeholder}
        onBlur={syncChangeFromDom}
        onClick={handleClick}
        onCompositionEnd={() => {
          isComposingRef.current = false;
          syncChangeFromDom();
        }}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onInput={syncChangeFromDom}
        onKeyDown={handleKeyDown}
        onKeyUp={syncChangeFromDom}
        onPaste={handlePaste}
        ref={editorRef}
        role="textbox"
        spellCheck
        suppressContentEditableWarning
      />
    </div>
  );
});

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

function getSelectionClientRect(root: HTMLElement | null) {
  const selection = window.getSelection();
  if (!root || !selection || selection.rangeCount === 0) return null;
  const activeRange = selection.getRangeAt(0);
  if (!root.contains(activeRange.startContainer)) return null;

  const range = activeRange.cloneRange();
  range.collapse(true);

  const clientRect = Array.from(range.getClientRects()).find((rect) => rect.width || rect.height);
  if (clientRect) {
    return {
      bottom: clientRect.bottom,
      left: clientRect.left,
      top: clientRect.top,
    };
  }

  const boundingRect = range.getBoundingClientRect();
  if (boundingRect.width || boundingRect.height) {
    return {
      bottom: boundingRect.bottom,
      left: boundingRect.left,
      top: boundingRect.top,
    };
  }

  const marker = document.createElement("span");
  marker.setAttribute("data-rich-prompt-caret-marker", "true");
  marker.style.cssText = "display:inline-block;width:0;height:1em;overflow:hidden;line-height:1em;";

  const restoreRange = activeRange.cloneRange();
  range.insertNode(marker);
  const markerRect = marker.getBoundingClientRect();
  marker.remove();
  selection.removeAllRanges();
  selection.addRange(restoreRange);

  if (markerRect.width || markerRect.height) {
    return {
      bottom: markerRect.bottom,
      left: markerRect.left,
      top: markerRect.top,
    };
  }

  const editorRect = root.getBoundingClientRect();
  return {
    bottom: Math.min(editorRect.bottom - 12, editorRect.top + 44),
    left: editorRect.left + 18,
    top: Math.min(editorRect.bottom - 32, editorRect.top + 24),
  };
}

function moveCaretToTokenPosition(parent: Node | null, index: number, fallbackRoot: HTMLElement | null) {
  const root = fallbackRoot;
  if (!root) return;
  const targetParent = parent || root;
  const safeIndex = Math.max(0, Math.min(index, targetParent.childNodes.length));
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.setStart(targetParent, safeIndex);
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
    "group mx-0.5 inline-flex min-h-7 items-center gap-1 rounded-full border border-[#ffb44d]/30",
    "bg-[#0b0d12]/78 py-0.5 pl-2 pr-1 align-middle text-xs font-black text-[#ffd08a]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,.08)] transition hover:border-[#ffb44d]/55 hover:bg-[#ffb44d]/12",
    "data-[reference-selected=true]:border-[#ffb44d]/70 data-[reference-selected=true]:bg-[#ffb44d]/18",
  ].join(" ");

  const icon = document.createElement("span");
  icon.className = "grid size-4 shrink-0 place-items-center rounded-full bg-[#ffb44d]/14 text-[10px] text-[#ffcf92]";
  icon.textContent = node.mediaType === "video" ? "▶" : node.mediaType === "audio" ? "♪" : "◧";

  const label = document.createElement("span");
  label.textContent = node.displayToken;

  const removeButton = document.createElement("button");
  removeButton.contentEditable = "false";
  removeButton.dataset.referenceTokenRemove = "true";
  removeButton.type = "button";
  removeButton.ariaLabel = `Remove ${node.displayToken}`;
  removeButton.className = [
    "ml-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-white/10",
    "bg-[#05070b]/72 text-[10px] leading-none text-white/50 opacity-0 transition",
    "hover:border-[#ff6b6b]/35 hover:bg-[#ff6b6b]/18 hover:text-[#ffb0b0]",
    "focus:opacity-100 focus:outline-none group-hover:opacity-100 group-data-[reference-selected=true]:opacity-100",
  ].join(" ");
  removeButton.textContent = "x";
  removeButton.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  removeButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const parent = span.parentNode;
    const index = parent ? Array.from(parent.childNodes).indexOf(span) : 0;
    const editor = span.closest("[contenteditable='true']") as HTMLElement | null;
    span.remove();
    moveCaretToTokenPosition(parent, index, editor);
    editor?.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
  });
  const removeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  removeIcon.setAttribute("aria-hidden", "true");
  removeIcon.setAttribute("focusable", "false");
  removeIcon.setAttribute("viewBox", "0 0 16 16");
  removeIcon.setAttribute("class", "size-3");
  const firstLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
  firstLine.setAttribute("d", "M4 4l8 8");
  firstLine.setAttribute("stroke", "currentColor");
  firstLine.setAttribute("stroke-linecap", "round");
  firstLine.setAttribute("stroke-width", "1.8");
  const secondLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
  secondLine.setAttribute("d", "M12 4l-8 8");
  secondLine.setAttribute("stroke", "currentColor");
  secondLine.setAttribute("stroke-linecap", "round");
  secondLine.setAttribute("stroke-width", "1.8");
  removeIcon.append(firstLine, secondLine);
  removeButton.append(removeIcon);

  span.append(icon, label, removeButton);
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
      onRequestMentionMenu({ anchorEl: editor, anchorRect: getSelectionClientRect(editor) || undefined, range: activeRange });
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
    function handleSetCaret(event: Event) {
      const offset = Number((event as CustomEvent<{ offset?: number }>).detail?.offset);
      if (!Number.isFinite(offset)) return;
      setSelectionOffset(editor, offset);
    }
    editor.addEventListener("shadowedge:set-rich-prompt-caret", handleSetCaret);
    return () => {
      editor.removeEventListener("input", syncChangeFromDom);
      editor.removeEventListener("keyup", syncChangeFromDom);
      editor.removeEventListener("blur", syncChangeFromDom);
      editor.removeEventListener("shadowedge:set-rich-prompt-caret", handleSetCaret);
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
    if ((event.target as HTMLElement | null)?.closest("[data-reference-token-remove='true']")) return;
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

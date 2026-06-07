"use client";

import { useEffect, useRef, useState } from "react";
import { getReadyMentionableMediaItems } from "@/lib/video-mentions";
import type { MentionableMediaItem } from "@/lib/video-mentions";
import type { UploadMediaItem, UploadMediaRole } from "@/types/video";

const roleOptions: Array<{ label: string; value: UploadMediaRole }> = [
  { label: "Reference", value: "reference" },
  { label: "Start Frame", value: "start_frame" },
  { label: "End Frame", value: "end_frame" },
];

function insertMention(item: MentionableMediaItem) {
  window.dispatchEvent(
    new CustomEvent("shadowedge:insert-video-mention", {
      detail: {
        display: item.display,
        type: item.type,
        index: item.index,
      },
    }),
  );
}

function mediaFallback(type: MentionableMediaItem["type"]) {
  if (type === "audio") return "AUD";
  if (type === "video") return "VID";
  return "IMG";
}

function roleLabel(role?: UploadMediaRole) {
  if (role === "start_frame") return "Start Frame";
  if (role === "end_frame") return "End Frame";
  return "Reference";
}

export function ReferenceMediaTray({
  media,
  onRemove,
  onRoleChange,
}: {
  media: UploadMediaItem[];
  onRemove: (id: string) => void;
  onRoleChange: (id: string, role: UploadMediaRole) => void;
}) {
  const mentionItems = getReadyMentionableMediaItems(media);
  const [openRoleId, setOpenRoleId] = useState("");
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!openRoleId) return;

    function closeRoleMenu(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpenRoleId("");
    }

    function closeFloatingMenu() {
      setOpenRoleId("");
    }

    window.addEventListener("pointerdown", closeRoleMenu);
    window.addEventListener("resize", closeFloatingMenu);
    window.addEventListener("scroll", closeFloatingMenu, true);

    return () => {
      window.removeEventListener("pointerdown", closeRoleMenu);
      window.removeEventListener("resize", closeFloatingMenu);
      window.removeEventListener("scroll", closeFloatingMenu, true);
    };
  }, [openRoleId]);

  if (!mentionItems.length) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[.035] px-3 py-2 text-xs leading-5 text-white/40">
        Ready uploads become @ references here.
      </section>
    );
  }

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[.04] p-3" ref={rootRef}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-black text-white">References</h2>
        <span className="text-[11px] font-bold text-white/38">{mentionItems.length} ready</span>
      </div>

      <div className="se-subtle-scrollbar grid max-h-[230px] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {mentionItems.map((item) => {
          const source = media.find((mediaItem) => mediaItem.id === item.id);
          const currentRole = source?.role || "reference";

          return (
            <article
              className="group relative overflow-visible rounded-2xl border border-white/10 bg-black/22 p-1.5 transition hover:border-[#ffb44d]/38"
              key={`${item.type}-${item.index}-${item.id}`}
            >
              <button className="block w-full text-left" onClick={() => insertMention(item)} type="button">
                <span className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-white/[.06]">
                  {item.type === "image" && item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="h-full w-full object-cover" src={item.previewUrl} />
                  ) : item.type === "video" && item.url ? (
                    <video className="h-full w-full object-cover" muted playsInline preload="metadata" src={item.url} />
                  ) : (
                    <span className="text-[10px] font-black text-white/45">{mediaFallback(item.type)}</span>
                  )}
                  <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.1em] text-[#ffd08a]">
                    {roleLabel(currentRole)}
                  </span>
                  <span className="absolute bottom-1 right-1 rounded-full bg-emerald-400/18 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.1em] text-emerald-100">
                    Ready
                  </span>
                </span>
                <span className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-black text-[#ffd08a]">{item.display}</span>
                  <span className="truncate text-[10px] text-white/36">{mediaFallback(item.type)}</span>
                </span>
              </button>

              <button
                aria-label={`Remove ${item.display}`}
                className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-black/75 text-[11px] text-white/74 opacity-0 transition hover:text-red-100 group-hover:opacity-100"
                onClick={() => onRemove(item.id)}
                type="button"
              >
                x
              </button>

              <div className="absolute left-2 top-2">
                <button
                  aria-expanded={openRoleId === item.id}
                  aria-label={`Change ${item.display} role`}
                  className="rounded-full border border-white/10 bg-black/70 px-2 py-1 text-[10px] font-black text-white/70 opacity-0 transition hover:border-[#ffb44d]/38 hover:text-[#ffd08a] group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenRoleId((current) => (current === item.id ? "" : item.id));
                  }}
                  type="button"
                >
                  Role
                </button>

                {openRoleId === item.id ? (
                  <div className="absolute left-0 top-8 z-[90] w-36 overflow-hidden rounded-2xl border border-white/10 bg-[#10141f]/98 p-1 shadow-2xl shadow-black/50">
                    {roleOptions.map((option) => (
                      <button
                        className={`w-full rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                          currentRole === option.value
                            ? "bg-[#ffb44d]/16 text-[#ffd08a]"
                            : "text-white/68 hover:bg-white/[.06] hover:text-white"
                        }`}
                        key={option.value}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRoleChange(item.id, option.value);
                          setOpenRoleId("");
                        }}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

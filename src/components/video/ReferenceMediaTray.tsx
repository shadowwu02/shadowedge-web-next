import { getReadyMentionableMediaItems } from "@/lib/video-mentions";
import type { MentionableMediaItem } from "@/lib/video-mentions";
import type { UploadMediaItem } from "@/types/video";

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

export function ReferenceMediaTray({
  media,
  onRemove,
}: {
  media: UploadMediaItem[];
  onRemove: (id: string) => void;
}) {
  const mentionItems = getReadyMentionableMediaItems(media);

  if (!mentionItems.length) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[.035] px-3 py-2 text-xs leading-5 text-white/40">
        Ready uploads become @ references here.
      </section>
    );
  }

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[.04] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-black text-white">References</h2>
        <span className="text-[11px] font-bold text-white/38">{mentionItems.length} ready</span>
      </div>

      <div className="se-scrollbar flex gap-2 overflow-x-auto pb-1">
        {mentionItems.map((item) => (
          <article
            className="group relative grid w-20 shrink-0 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1.5 transition hover:border-[#ffb44d]/40"
            key={`${item.type}-${item.index}-${item.id}`}
          >
            <button className="grid gap-1 text-left" onClick={() => insertMention(item)} type="button">
              <span className="grid aspect-video place-items-center overflow-hidden rounded-xl bg-white/[.06]">
                {item.type === "image" && item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="h-full w-full object-cover" src={item.previewUrl} />
                ) : (
                  <span className="text-[10px] font-black text-white/45">{mediaFallback(item.type)}</span>
                )}
              </span>
              <span className="truncate text-[11px] font-black text-[#ffd08a]">{item.display}</span>
            </button>
            <button
              aria-label={`Remove ${item.display}`}
              className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/70 text-[11px] text-white/70 opacity-0 transition hover:text-red-100 group-hover:opacity-100"
              onClick={() => onRemove(item.id)}
              type="button"
            >
              x
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

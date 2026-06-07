import type { UploadMediaItem } from "@/types/video";

export function ReferenceMediaMention({ media }: { media: UploadMediaItem[] }) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[.045] p-4">
      <h2 className="text-sm font-black text-white">@ media references</h2>
      <p className="mt-2 text-sm leading-6 text-white/55">
        Phase 1 keeps references as structured upload items. The richer @ token editor will be migrated after
        the foundation is stable.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {media.length ? (
          media.map((item, index) => (
            <span className="rounded-full border border-white/10 bg-white/[.055] px-3 py-1 text-xs text-white/68" key={item.id}>
              @{item.type === "image" ? "图" : item.type === "video" ? "视频" : "音频"}
              {index + 1}
            </span>
          ))
        ) : (
          <span className="text-xs text-white/38">No media selected</span>
        )}
      </div>
    </section>
  );
}

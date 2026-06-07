import { getReadyMentionableMediaItems } from "@/lib/video-mentions";
import type { UploadMediaItem } from "@/types/video";

export function ReferenceMediaMention({ media }: { media: UploadMediaItem[] }) {
  const mentionItems = getReadyMentionableMediaItems(media);

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[.045] p-3">
      <h2 className="text-sm font-black text-white">@ media references</h2>
      <p className="mt-2 text-xs leading-5 text-white/55">
        Type @ in the prompt to reference uploaded ready media. Tokens stay as readable text in the editor and are
        converted before generation.
      </p>
      <div className="mt-3 flex max-h-16 flex-wrap gap-2 overflow-hidden">
        {mentionItems.length ? (
          mentionItems.map((item) => (
            <span className="rounded-full border border-white/10 bg-white/[.055] px-3 py-1 text-xs text-white/68" key={`${item.type}-${item.index}-${item.id}`}>
              {item.display}
            </span>
          ))
        ) : (
          <span className="text-xs text-white/38">No ready media references yet</span>
        )}
      </div>
    </section>
  );
}

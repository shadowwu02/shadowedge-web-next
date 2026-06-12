"use client";

import { formatTime } from "@/lib/utils";
import type { ImageHistoryItem } from "@/types/image";

function DetailRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-[16px] border border-white/8 bg-white/[.03] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/40">{label}</p>
      <p className="mt-1 truncate text-xs font-semibold text-[#f4f4f4]/78">{value || "--"}</p>
    </div>
  );
}

export function ImageOutputDetailPanel({ job }: { job: ImageHistoryItem | null }) {
  if (!job) {
    return (
      <section className="se-card-quiet rounded-[26px] p-4">
        <p className="se-eyebrow">Detail</p>
        <div className="grid min-h-[180px] place-items-center text-center">
          <div>
            <p className="text-sm font-semibold text-[#f4f4f4]">Select an image job</p>
            <p className="mt-2 text-xs leading-5 text-[#b9b9b9]/52">Prompt, params, cost, and output URLs will show here.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="se-card-quiet rounded-[26px] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="se-eyebrow">Detail</p>
          <h3 className="mt-1 truncate text-sm font-black text-[#f4f4f4]">{job.model || "Image job"}</h3>
        </div>
        <button
          className="se-button-ghost shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold"
          onClick={() => void navigator.clipboard?.writeText(job.dbJobId || job.jobId)}
          type="button"
        >
          Copy job ID
        </button>
      </div>

      <div className="space-y-3">
        <div className="rounded-[18px] border border-white/8 bg-[#05070b]/52 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/40">Prompt</p>
          <p className="line-clamp-5 text-xs leading-5 text-[#f4f4f4]/78">{job.prompt || "--"}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Status" value={job.status} />
          <DetailRow label="Created" value={formatTime(job.createdAt)} />
          <DetailRow label="Ratio" value={job.ratio || "auto"} />
          <DetailRow label="Resolution" value={job.resolution || job.quality || "--"} />
          <DetailRow label="Batch" value={job.batchCount} />
          <DetailRow label="Cost" value={job.cost ? `${job.cost} credits` : "--"} />
          <DetailRow label="References" value={job.referenceCount} />
          <DetailRow label="Provider" value={job.provider || job.providerModel || "--"} />
        </div>

        {job.errorMessage ? (
          <div className="rounded-[18px] border border-[#8c4632]/42 bg-[#2a1012]/72 px-3 py-2 text-xs leading-5 text-[#f2b3a1]">{job.errorMessage}</div>
        ) : null}

        {job.outputUrls.length ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/40">Output URLs</p>
            {job.outputUrls.map((url, index) => (
              <a
                className="block truncate rounded-[14px] border border-white/8 bg-white/[.03] px-3 py-2 text-[11px] font-semibold text-[#ffd08a] hover:border-[#ffb44d]/30"
                href={url}
                key={`${url}-${index}`}
                rel="noreferrer"
                target="_blank"
              >
                Image {index + 1}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

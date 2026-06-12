"use client";

import { isImageActiveStatus, isImageCompletedStatus, isImageFailedStatus } from "@/lib/image/imageHistoryUtils";
import { formatTime } from "@/lib/utils";
import type { ImageHistoryItem } from "@/types/image";

function CopyIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <rect height="13" rx="2" stroke="currentColor" strokeWidth="2" width="13" x="9" y="9" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path d="M14 4h6v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m10 14 10-10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function statusClass(status: string) {
  if (isImageFailedStatus(status)) return "se-status-failed";
  if (isImageCompletedStatus(status)) return "se-status-completed";
  if (isImageActiveStatus(status)) return "se-status-processing";
  return "se-status-neutral";
}

export function ImageOutputStage({
  error,
  isGenerating,
  isPolling,
  job,
  onRefresh,
}: {
  error?: string;
  isGenerating?: boolean;
  isPolling?: boolean;
  job: ImageHistoryItem | null;
  onRefresh?: (jobId: string) => void;
}) {
  const status = String(job?.status || "");
  const isActive = Boolean(job && isImageActiveStatus(status));
  const isFailed = Boolean(job && isImageFailedStatus(status));
  const isCompleted = Boolean(job && isImageCompletedStatus(status) && job.outputUrls.length);

  return (
    <section className="se-panel flex h-full min-h-[520px] flex-col overflow-hidden rounded-[34px] p-4 shadow-2xl shadow-black/24">
      <div className="mb-3 flex flex-none flex-wrap items-start justify-between gap-3">
        <div>
          <p className="se-eyebrow">Latest output</p>
          <h2 className="mt-1 text-lg font-black text-[#f4f4f4]">Image result stage</h2>
          <p className="mt-1 text-xs text-[#b9b9b9]/48">
            {job ? `${job.model || "Image model"} · ${formatTime(job.createdAt)}` : "Generated images will appear here."}
          </p>
        </div>
        {job ? (
          <div className="flex items-center gap-2">
            <span className={`se-status rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(status)}`}>{status || "unknown"}</span>
            {isActive && onRefresh ? (
              <button
                className="se-button-secondary rounded-full px-3 py-1.5 text-[11px] font-semibold"
                onClick={() => onRefresh(job.dbJobId || job.jobId)}
                type="button"
              >
                Check
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 place-items-center overflow-hidden rounded-[28px] border border-white/10 bg-[#05070b]/80 p-3">
        {!job ? (
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 grid size-16 place-items-center rounded-[28px] border border-[#ffb44d]/20 bg-[#ffb44d]/10 text-[#ffd08a]">
              <svg aria-hidden="true" className="size-7" fill="none" viewBox="0 0 24 24">
                <rect height="16" rx="3" stroke="currentColor" strokeWidth="2" width="18" x="3" y="4" />
                <path d="m7 16 3-3 2 2 3-4 2 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <p className="text-xl font-black text-[#f4f4f4]">No image yet</p>
            <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/55">Add a prompt, choose a model, and your generated images will appear here.</p>
          </div>
        ) : isCompleted ? (
          <div className="se-scrollbar h-full w-full overflow-y-auto">
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {job.outputUrls.map((url, index) => (
                <article className="overflow-hidden rounded-[24px] border border-white/10 bg-black/42" key={`${url}-${index}`}>
                  <button className="block aspect-square w-full bg-black/40" onClick={() => window.open(url, "_blank", "noopener,noreferrer")} type="button">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={`Output ${index + 1}`} className="h-full w-full object-contain" src={url} />
                  </button>
                  <div className="flex items-center justify-between gap-2 p-2.5">
                    <span className="text-[11px] font-semibold text-[#f4f4f4]/72">Image {index + 1}</span>
                    <span className="flex items-center gap-1">
                      <button
                        className="se-button-ghost inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold"
                        onClick={() => void navigator.clipboard?.writeText(url)}
                        type="button"
                      >
                        <CopyIcon />
                        Copy
                      </button>
                      <a className="se-button-secondary inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold" href={url} rel="noreferrer" target="_blank">
                        <ExternalIcon />
                        Open
                      </a>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : isActive || isGenerating || isPolling ? (
          <div className="max-w-md text-center">
            <span className="mx-auto mb-5 block size-14 animate-pulse rounded-[24px] border border-[#ffb44d]/30 bg-[#ffb44d]/20" />
            <p className="text-xl font-black text-[#f4f4f4]">Generating image</p>
            <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/55">Checking generation status. This will stop automatically when the job finishes.</p>
            <p className="mt-3 text-xs text-[#b9b9b9]/35">{job?.dbJobId || job?.jobId}</p>
          </div>
        ) : isFailed ? (
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 grid size-14 place-items-center rounded-[24px] border border-[#8c4632]/42 bg-[#2a1012] text-xl font-black text-[#f2b3a1]">!</div>
            <p className="text-xl font-black text-[#f2b3a1]">Generation failed</p>
            <p className="mt-2 text-sm leading-6 text-[#f2b3a1]/68">{job.errorMessage || error || "Image generation failed."}</p>
            {job.refunded || job.refundStatus === "refunded" ? (
              <span className="mt-4 inline-flex rounded-full border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-3 py-1 text-xs font-semibold text-[#ffd08a]">Refunded</span>
            ) : null}
          </div>
        ) : (
          <div className="max-w-md text-center text-sm text-[#b9b9b9]/55">Waiting for image output...</div>
        )}
      </div>
    </section>
  );
}

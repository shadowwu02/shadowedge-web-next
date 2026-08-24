"use client";

import { useI18n } from "@/i18n/useI18n";
import {
  canConfirmRemakeExport,
  type RemakeExportFlowState,
} from "@/lib/video/remakeExportProductFlow";

export type RemakeExportFlowPanelProps = {
  state: RemakeExportFlowState;
  onCancel: () => void;
  onConfirm: () => void;
  onDownload?: () => void;
  onRequestPreview: () => void;
};

function formatDuration(seconds: number) {
  return `${Number(seconds.toFixed(1))}s`;
}

export function RemakeExportFlowPanel({
  state,
  onCancel,
  onConfirm,
  onDownload,
  onRequestPreview,
}: RemakeExportFlowPanelProps) {
  const { t, tf } = useI18n();
  const preview = state.phase === "awaiting_confirmation" || state.phase === "confirming"
    ? state.preview
    : null;
  const render = "render" in state ? state.render : null;

  return (
    <section
      aria-labelledby="remake-export-title"
      className="mt-5 grid gap-4 rounded-[24px] border border-[#7dd3fc]/20 bg-[#07131b]/72 p-4"
      data-testid="remake-export-flow"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="se-eyebrow">{t("video.remake.export.eyebrow")}</p>
          <h3 className="mt-1 text-base font-semibold text-[#f4f4f4]" id="remake-export-title">
            {t("video.remake.export.title")}
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#b9b9b9]/68">
            {t("video.remake.export.description")}
          </p>
        </div>
        {render ? (
          <span className="rounded-full border border-[#7dd3fc]/22 bg-[#0b2a3a]/64 px-3 py-1.5 text-xs font-semibold text-[#b7e8ff]/88">
            {t(`video.remake.export.status.${render.status}`)}
          </span>
        ) : null}
      </div>

      {state.phase === "idle" || state.phase === "error" ? (
        <div className="grid gap-3">
          {state.phase === "error" ? (
            <p className="rounded-[16px] border border-[#7f2d2d]/42 bg-[#2a1012]/70 p-3 text-xs text-[#f1b4b4]/86">
              {t("video.remake.export.error")}
            </p>
          ) : null}
          <button
            className="se-button-secondary min-h-11 justify-self-start rounded-[16px] px-4 text-xs font-semibold"
            onClick={onRequestPreview}
            type="button"
          >
            {t("video.remake.export.review")}
          </button>
        </div>
      ) : null}

      {state.phase === "previewing" ? (
        <p aria-live="polite" className="text-sm text-[#b9b9b9]/72">
          {t("video.remake.export.preparing")}
        </p>
      ) : null}

      {preview ? (
        <div className="grid gap-3" data-testid="remake-export-confirmation">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[16px] border border-white/8 bg-black/20 p-3">
              <p className="se-eyebrow">{t("video.remake.export.snapshot")}</p>
              <strong className="mt-1 block text-sm text-[#f4f4f4]/86">
                {tf("video.remake.export.shots", { count: preview.snapshot.shotCount })}
              </strong>
            </div>
            <div className="rounded-[16px] border border-white/8 bg-black/20 p-3">
              <p className="se-eyebrow">{t("video.remake.export.duration")}</p>
              <strong className="mt-1 block text-sm text-[#f4f4f4]/86">
                {formatDuration(preview.snapshot.durationSeconds)}
              </strong>
            </div>
            <div className="rounded-[16px] border border-white/8 bg-black/20 p-3">
              <p className="se-eyebrow">{t("video.remake.export.estimate")}</p>
              <strong className="mt-1 block text-sm text-[#ffd08a]/88">
                {tf("video.remake.export.credits", { credits: preview.estimate.credits })}
              </strong>
              <small className="mt-1 block text-[10px] text-[#b9b9b9]/52">ESTIMATE_ONLY</small>
            </div>
            <div className="rounded-[16px] border border-white/8 bg-black/20 p-3">
              <p className="se-eyebrow">{t("video.remake.export.balance")}</p>
              <strong className="mt-1 block text-sm text-[#f4f4f4]/86">
                {preview.creditPreview.balance === null
                  ? t("video.remake.export.balanceUnknown")
                  : tf("video.remake.export.credits", { credits: preview.creditPreview.balance })}
              </strong>
            </div>
          </div>

          {!preview.creditPreview.sufficient ? (
            <p className="rounded-[16px] border border-[#7f2d2d]/42 bg-[#2a1012]/70 p-3 text-xs text-[#f1b4b4]/86">
              {t("video.remake.export.insufficientCredits")}
            </p>
          ) : (
            <p className="rounded-[16px] border border-[#ffb44d]/24 bg-[#ffb44d]/9 p-3 text-xs leading-5 text-[#ffd08a]/86">
              {t("video.remake.export.confirmationNotice")}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              aria-busy={state.phase === "confirming"}
              className="se-button-primary min-h-11 rounded-[16px] px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canConfirmRemakeExport(state) || state.phase === "confirming"}
              onClick={onConfirm}
              type="button"
            >
              {state.phase === "confirming"
                ? t("video.remake.export.confirming")
                : t("video.remake.export.confirm")}
            </button>
            <button
              className="se-button-secondary min-h-11 rounded-[16px] px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              disabled={state.phase === "confirming"}
              onClick={onCancel}
              type="button"
            >
              {t("video.remake.export.cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {render ? (
        <div className="grid gap-3" aria-live="polite" data-testid="remake-export-status">
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0ea5e9,#ffb44d)] transition-[width]"
              style={{ width: `${Math.max(0, Math.min(100, render.progress))}%` }}
            />
          </div>
          <p className="text-xs leading-5 text-[#b9b9b9]/68">
            {t(`video.remake.export.statusHelp.${render.status}`)}
          </p>
          {render.status === "completed" && render.download.available && render.download.href ? (
            onDownload ? (
              <button
                className="se-button-primary min-h-11 justify-self-start rounded-[16px] px-4 py-3 text-xs font-semibold"
                onClick={onDownload}
                type="button"
              >
                {t("video.remake.export.download")}
              </button>
            ) : (
              <a
                className="se-button-primary min-h-11 justify-self-start rounded-[16px] px-4 py-3 text-xs font-semibold"
                download
                href={render.download.href}
              >
                {t("video.remake.export.download")}
              </a>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

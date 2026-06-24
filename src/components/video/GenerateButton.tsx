"use client";

import { useI18n } from "@/i18n/useI18n";

export function GenerateButton({
  helperText,
  disabled,
  isSubmitting,
  credits,
  label,
  onClick,
}: {
  helperText?: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  credits?: number;
  label?: string;
  onClick: () => void;
}) {
  const { t, tf } = useI18n();
  const buttonLabel = label || (isSubmitting ? t("video.actions.submitting") : credits ? tf("video.actions.generateWithCredits", { credits }) : t("generate"));

  return (
    <div className="rounded-[18px] border border-[#ffb44d]/14 bg-[linear-gradient(180deg,rgba(255,178,74,0.085),rgba(20,18,14,0.72))] p-2 shadow-[0_14px_44px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.045)]">
      <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
        <span className="se-eyebrow">{t("video.actions.readyCheck")}</span>
        {credits ? (
          <span className="rounded-full border border-[#ffb44d]/22 bg-[#ffb44d]/9 px-2 py-0.5 text-[10px] font-semibold text-[#ffd08a]">
            {tf("video.actions.creditsPill", { credits })}
          </span>
        ) : null}
      </div>
      <button
        className="se-button-primary min-h-[46px] w-full rounded-[15px] px-4 text-sm font-semibold shadow-[0_14px_44px_rgba(0,0,0,0.34)]"
        disabled={disabled || isSubmitting}
        onClick={onClick}
        type="button"
      >
        {buttonLabel}
      </button>
      {helperText ? (
        <p className={`mt-1.5 text-center text-[10.5px] leading-4 ${disabled || isSubmitting ? "text-[#f7f3ea]/52" : "text-[#f7f3ea]/46"}`}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

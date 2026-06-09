"use client";

import { useI18n } from "@/i18n/useI18n";

export function GenerateButton({
  disabled,
  isSubmitting,
  credits,
  label,
  onClick,
}: {
  disabled?: boolean;
  isSubmitting?: boolean;
  credits?: number;
  label?: string;
  onClick: () => void;
}) {
  const { t, tf } = useI18n();
  const buttonLabel = label || (isSubmitting ? t("video.actions.submitting") : credits ? tf("video.actions.generateWithCredits", { credits }) : t("generate"));

  return (
    <button
      className="min-h-12 w-full rounded-[18px] border border-[#ffd08a]/34 bg-[linear-gradient(180deg,#ffc96d,#ffb44d)] px-5 text-sm font-semibold text-[#05070b] shadow-[0_18px_36px_rgba(255,180,77,0.16),inset_0_1px_0_rgba(255,255,255,0.18)] transition hover:border-[#ffd08a]/48 hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:border-[rgba(244,244,244,0.08)] disabled:bg-[#33323a] disabled:bg-none disabled:text-[#b9b9b9]/58 disabled:shadow-none"
      disabled={disabled || isSubmitting}
      onClick={onClick}
      type="button"
    >
      {buttonLabel}
    </button>
  );
}

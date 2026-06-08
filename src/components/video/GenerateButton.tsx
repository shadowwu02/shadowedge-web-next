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
      className="min-h-12 w-full rounded-[22px] bg-[linear-gradient(180deg,#ffc766,#ffb44d)] px-5 text-sm font-semibold text-[#05070b] shadow-[0_16px_34px_rgba(255,180,77,0.18)] transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:bg-[#33323a] disabled:bg-none disabled:text-[#b9b9b9]/58 disabled:shadow-none"
      disabled={disabled || isSubmitting}
      onClick={onClick}
      type="button"
    >
      {buttonLabel}
    </button>
  );
}

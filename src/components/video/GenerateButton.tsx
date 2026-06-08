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
      className="min-h-12 w-full rounded-2xl bg-[#ffb44d] px-5 text-sm font-black text-[#05070b] shadow-xl shadow-[#ffb44d]/10 transition hover:bg-[#ffc766] disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled || isSubmitting}
      onClick={onClick}
      type="button"
    >
      {buttonLabel}
    </button>
  );
}

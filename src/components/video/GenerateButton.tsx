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
      className="min-h-12 w-full rounded-[18px] border border-[#d88d31]/34 bg-[linear-gradient(180deg,#c88936,#ad681f)] px-5 text-sm font-semibold text-[#080a0f] shadow-[0_16px_34px_rgba(255,180,77,0.1),inset_0_1px_0_rgba(255,255,255,0.14)] transition duration-200 hover:-translate-y-0.5 hover:border-[#ffd08a]/55 hover:bg-[linear-gradient(180deg,#f0b25b,#cc7d28)] hover:text-[#05070b] hover:shadow-[0_18px_42px_rgba(255,180,77,0.2),inset_0_1px_0_rgba(255,255,255,0.22)] active:translate-y-px active:shadow-[0_8px_18px_rgba(255,180,77,0.12)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:border-[rgba(244,244,244,0.08)] disabled:bg-[#33323a] disabled:bg-none disabled:text-[#b9b9b9]/58 disabled:shadow-none"
      disabled={disabled || isSubmitting}
      onClick={onClick}
      type="button"
    >
      {buttonLabel}
    </button>
  );
}

"use client";

import { useI18n } from "@/i18n/useI18n";

export function AudioToggle({
  checked,
  disabled,
  disabledReason,
  onChange,
  unsupported,
}: {
  checked: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onChange: (checked: boolean) => void;
  unsupported?: boolean;
}) {
  const { t } = useI18n();

  return (
    <button
      aria-checked={checked}
      className={`group flex min-h-[54px] items-center justify-between gap-3 rounded-[18px] border px-3 py-2 text-left transition ${
        checked && unsupported
          ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
          : checked && !disabled
          ? "se-status-ready text-[#ffd08a]"
          : "se-control text-[#f4f4f4]/76 hover:text-[#ffd08a]"
      } disabled:cursor-not-allowed disabled:border-[rgba(244,244,244,0.08)] disabled:bg-[#111318]/48 disabled:text-[#b9b9b9]/42`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold leading-4">{t("video.params.audio")}</span>
        <span className="mt-0.5 block truncate text-[11px] leading-4 text-[#b9b9b9]/58">
          {disabledReason || (unsupported ? t("video.params.audioUnsupported") : checked ? t("video.params.audioOn") : t("video.params.audioOff"))}
        </span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
          checked && unsupported
            ? "border-amber-300/30 bg-amber-400/25"
            : checked && !disabled
            ? "border-[#ffcc86]/42 bg-[#ffb44d]/70 shadow-[0_0_18px_rgba(255,180,77,0.18)]"
            : "border-white/10 bg-[#05070b]/70"
        }`}
      >
        <span
          className={`absolute top-1 grid size-4 place-items-center rounded-full bg-[#f4f4f4] shadow-md shadow-black/30 transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

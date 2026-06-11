"use client";

import { useI18n } from "@/i18n/useI18n";

export function AudioToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { t } = useI18n();

  return (
    <button
      aria-checked={checked}
      className={`group flex min-h-[54px] items-center justify-between gap-3 rounded-[18px] border px-3 py-2 text-left transition ${
        checked && !disabled
          ? "border-[#ffb44d]/36 bg-[#ffb44d]/10 text-[#ffd08a]"
          : "border-[rgba(244,244,244,0.08)] bg-[#111318]/72 text-[#f4f4f4]/76 hover:border-[#ffb44d]/30 hover:bg-[#ffb44d]/7 hover:text-[#ffd08a]"
      } disabled:cursor-not-allowed disabled:border-[rgba(244,244,244,0.08)] disabled:bg-[#111318]/48 disabled:text-[#b9b9b9]/42`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold leading-4">{t("video.params.audio")}</span>
        <span className="mt-0.5 block truncate text-[11px] leading-4 text-[#b9b9b9]/58">
          {disabled ? t("video.params.audioUnsupported") : t("video.params.audioHint")}
        </span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
          checked && !disabled
            ? "border-[#ffcc86]/42 bg-[#ffb44d]/70 shadow-[0_0_18px_rgba(255,180,77,0.18)]"
            : "border-white/10 bg-[#05070b]/70"
        }`}
      >
        <span
          className={`absolute top-1 grid size-4 place-items-center rounded-full bg-[#f4f4f4] shadow-md shadow-black/30 transition-transform ${
            checked && !disabled ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

"use client";

import type { Locale } from "@/i18n/dictionary";
import { cn } from "@/lib/utils";

export function LanguageSwitch({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-[rgba(244,244,244,0.08)] bg-[#080b10]/72 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_26px_rgba(0,0,0,0.18)] backdrop-blur-md">
      {(["en", "zh"] as const).map((item) => (
        <button
          className={cn(
            "h-7 min-w-10 rounded-full px-3 text-[12px] font-semibold leading-none transition",
            locale === item
              ? "border border-[#ffb44d]/28 bg-[#ffb44d]/14 text-[#ffd08a] shadow-[0_8px_20px_rgba(255,180,77,0.1)]"
              : "border border-transparent text-[#b9b9b9]/58 hover:bg-white/[.045] hover:text-[#f4f4f4]",
          )}
          key={item}
          onClick={() => onChange(item)}
          type="button"
        >
          {item === "en" ? "EN" : "中文"}
        </button>
      ))}
    </div>
  );
}

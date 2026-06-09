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
    <div className="inline-flex items-center rounded-full border border-[rgba(244,244,244,0.08)] bg-[#111318]/78 p-1 shadow-inner shadow-black/20">
      {(["en", "zh"] as const).map((item) => (
        <button
          className={cn(
            "h-8 min-w-11 rounded-full px-3 text-[13px] font-semibold leading-none transition-colors",
            locale === item
              ? "bg-[#ffb44d] text-[#05070b] shadow-[0_8px_18px_rgba(255,180,77,0.16)]"
              : "text-[#b9b9b9]/66 hover:bg-[#1a1c22]/86 hover:text-[#f4f4f4]",
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

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
    <div className="inline-flex rounded-full border border-white/10 bg-white/[.055] p-1">
      {(["en", "zh"] as const).map((item) => (
        <button
          className={cn(
            "h-8 rounded-full px-3 text-xs font-black transition",
            locale === item ? "bg-[#ffb44d] text-[#1f2027]" : "text-white/58 hover:text-white",
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

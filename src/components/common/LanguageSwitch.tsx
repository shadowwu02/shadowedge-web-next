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
    <div className="se-segmented inline-flex items-center rounded-full p-0.5 backdrop-blur-md">
      {(["en", "zh"] as const).map((item) => (
        <button
          className={cn(
            "se-segmented-item h-7 min-w-10 rounded-full px-3 text-[12px] font-semibold leading-none",
            locale === item ? "se-segmented-item-active" : "",
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

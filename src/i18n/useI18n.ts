"use client";

import { useCallback, useEffect, useState } from "react";
import { dictionary, type Locale } from "@/i18n/dictionary";

const languageStorageKey = "se_lang";

export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(languageStorageKey);
        if (stored === "zh" || stored === "en") setLocaleState(stored);
      } catch {
        // Keep the English default if local storage is unavailable.
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(languageStorageKey, next);
    } catch {
      // Non-fatal in private browsing contexts.
    }
  }, []);

  const t = useCallback(
    (key: keyof (typeof dictionary)["en"]) => dictionary[locale][key] || dictionary.en[key] || String(key),
    [locale],
  );

  return { locale, setLocale, t };
}

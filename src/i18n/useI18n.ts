"use client";

import { useCallback, useEffect, useState } from "react";
import { dictionary, type Locale } from "@/i18n/dictionary";

const languageStorageKey = "se_lang";
type DictionaryKey = keyof (typeof dictionary)["en"];

export function formatI18nText(template: string, values?: Record<string, string | number | null | undefined>) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key];
    return value === null || value === undefined ? match : String(value);
  });
}

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
    (key: DictionaryKey) => dictionary[locale][key] || dictionary.en[key] || String(key),
    [locale],
  );

  const tf = useCallback(
    (key: DictionaryKey, values?: Record<string, string | number | null | undefined>) => formatI18nText(t(key), values),
    [t],
  );

  return { locale, setLocale, t, tf };
}

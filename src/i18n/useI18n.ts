"use client";

import { useCallback, useEffect, useState } from "react";
import { dictionary, type Locale } from "@/i18n/dictionary";

const languageStorageKey = "se_lang";
const languageChangeEvent = "shadowedge:language-change";
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
    const applyStoredLocale = () => {
      try {
        const stored = window.localStorage.getItem(languageStorageKey);
        if (stored === "zh" || stored === "en") setLocaleState(stored);
      } catch {
        // Keep the English default if local storage is unavailable.
      }
    };

    const timer = window.setTimeout(() => {
      applyStoredLocale();
    }, 0);

    const handleLanguageChange = (event: Event) => {
      const next = event instanceof CustomEvent ? event.detail : null;
      if (next === "zh" || next === "en") setLocaleState(next);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === languageStorageKey) applyStoredLocale();
    };

    window.addEventListener(languageChangeEvent, handleLanguageChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(languageChangeEvent, handleLanguageChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(languageStorageKey, next);
    } catch {
      // Non-fatal in private browsing contexts.
    }
    window.dispatchEvent(new CustomEvent(languageChangeEvent, { detail: next }));
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

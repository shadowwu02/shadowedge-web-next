"use client";

import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { activeBrand } from "@/config/brand";
import { dictionary, type Locale } from "@/i18n/dictionary";

const languageStorageKey = "se_lang";
const languageCookieKey = "se_lang";
const languageChangeEvent = "shadowedge:language-change";
const defaultLocale: Locale = "en";
const noopSetLocale = () => undefined;
export type DictionaryKey = keyof (typeof dictionary)["en"];

type I18nValue = ReturnType<typeof createI18nValue>;

const I18nContext = createContext<I18nValue>(createI18nValue(defaultLocale, noopSetLocale));

export function getI18nServerLocaleSnapshot(): Locale {
  return defaultLocale;
}

export function getI18nBrowserLocaleSnapshot(): Locale {
  return getI18nStoredLocaleSnapshot() ?? getI18nServerLocaleSnapshot();
}

export function getI18nStoredLocaleSnapshot(): Locale | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(languageStorageKey);
    return stored === "zh" || stored === "en" ? stored : null;
  } catch {
    return null;
  }
}

function persistLocaleCookie(locale: Locale) {
  document.cookie = `${languageCookieKey}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  return document.cookie
    .split(";")
    .some((value) => value.trim() === `${languageCookieKey}=${locale}`);
}

export function formatI18nText(template: string, values?: Record<string, string | number | null | undefined>) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key];
    return value === null || value === undefined ? match : String(value);
  });
}

function applyBrandText(template: string) {
  if (activeBrand.name === "ShadowEdge") return template;
  return template.replace(/\bShadowEdge\b/g, activeBrand.name);
}

function createI18nValue(locale: Locale, setLocale: (next: Locale) => void) {
  const t = (key: DictionaryKey) => applyBrandText(dictionary[locale][key] || dictionary.en[key] || String(key));
  const tf = (key: DictionaryKey, values?: Record<string, string | number | null | undefined>) => formatI18nText(t(key), values);
  return { locale, setLocale, t, tf };
}

export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const reconcileStoredLocale = () => {
      const storedLocale = getI18nStoredLocaleSnapshot();
      if (!storedLocale) {
        try {
          window.localStorage.setItem(languageStorageKey, initialLocale);
        } catch {
          // Non-fatal in private browsing contexts.
        }
        persistLocaleCookie(initialLocale);
        return;
      }
      if (storedLocale !== initialLocale) {
        if (persistLocaleCookie(storedLocale)) {
          window.location.reload();
        }
      }
    };
    const handleLanguageChange = (event: Event) => {
      const next = event instanceof CustomEvent ? event.detail : null;
      if (next === "zh" || next === "en") setLocaleState(next);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === languageStorageKey) {
        const next = event.newValue;
        if (next === "zh" || next === "en") {
          persistLocaleCookie(next);
          setLocaleState(next);
        }
      }
    };

    reconcileStoredLocale();
    window.addEventListener(languageChangeEvent, handleLanguageChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(languageChangeEvent, handleLanguageChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [initialLocale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(languageStorageKey, next);
    } catch {
      // Non-fatal in private browsing contexts.
    }
    persistLocaleCookie(next);
    window.dispatchEvent(new CustomEvent(languageChangeEvent, { detail: next }));
  }, []);

  const value = useMemo(() => createI18nValue(locale, setLocale), [locale, setLocale]);
  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  return useContext(I18nContext);
}

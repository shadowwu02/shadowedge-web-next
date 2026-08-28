import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  getI18nBrowserLocaleSnapshot,
  getI18nServerLocaleSnapshot,
  getI18nStoredLocaleSnapshot,
  I18nProvider,
  useI18n,
} from "../src/i18n/useI18n";

const source = readFileSync(new URL("../src/i18n/useI18n.ts", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const originalWindow = globalThis.window;

function LocaleProbe() {
  const { locale } = useI18n();
  return createElement(
    "span",
    { "data-locale": locale },
    locale === "zh" ? "用 Prompt Studio 优化" : "Optimize in Prompt Studio",
  );
}

function renderInitialLocale(locale: "en" | "zh") {
  return renderToStaticMarkup(
    createElement(I18nProvider, { initialLocale: locale }, createElement(LocaleProbe)),
  );
}

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
    writable: true,
  });
});

describe("i18n hydration contract", () => {
  it("renders identical server and initial-client markup from the shared locale snapshot", () => {
    const serverEnglish = renderInitialLocale("en");
    const clientInitialEnglish = renderInitialLocale("en");
    const serverChinese = renderInitialLocale("zh");
    const clientInitialChinese = renderInitialLocale("zh");

    expect(clientInitialEnglish).toBe(serverEnglish);
    expect(clientInitialChinese).toBe(serverChinese);
    expect(serverEnglish).toContain("Optimize in Prompt Studio");
    expect(serverChinese).toContain("用 Prompt Studio 优化");
  });

  it("keeps the server and hydration snapshot deterministic when a browser preference exists", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => key === "se_lang" ? "zh" : null,
        },
      },
      writable: true,
    });

    expect(getI18nServerLocaleSnapshot()).toBe("en");
    expect(getI18nBrowserLocaleSnapshot()).toBe("zh");
    expect(getI18nStoredLocaleSnapshot()).toBe("zh");
    expect(source).toContain("useState<Locale>(initialLocale)");
    expect(layoutSource).toContain('(await cookies()).get("se_lang")?.value');
    expect(layoutSource).toContain("<I18nProvider initialLocale={initialLocale}>");
    expect(source).toContain("I18nContext.Provider");
  });

  it("uses one server-authoritative locale and migrates legacy storage without mixed rendering", () => {
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("suppressHydrationWarning");
    expect(source).not.toContain("requestAnimationFrame");
    expect(source).not.toContain("useSyncExternalStore");
    expect(source).toContain("export function I18nProvider");
    expect(source).toContain("useContext(I18nContext)");
    expect(source).toContain("persistLocaleCookie(storedLocale)");
    expect(source).toContain("window.location.reload()");
    expect(source).toContain('window.addEventListener(languageChangeEvent, handleLanguageChange)');
    expect(source).toContain('window.addEventListener("storage", handleStorage)');
  });
});

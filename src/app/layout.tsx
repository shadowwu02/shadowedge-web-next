import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MaintenanceGate } from "@/components/maintenance/MaintenanceGate";
import { activeBrand } from "@/config/brand";
import type { Locale } from "@/i18n/dictionary";
import { I18nProvider } from "@/i18n/useI18n";
import "./globals.css";

export const metadata: Metadata = {
  title: activeBrand.seo.title,
  description: activeBrand.seo.description,
  icons: {
    icon: activeBrand.assets.favicon,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const localeValue = (await cookies()).get("se_lang")?.value;
  const initialLocale: Locale = localeValue === "zh" ? "zh" : "en";

  return (
    <html lang={initialLocale} className="h-full antialiased">
      <body className="min-h-full bg-[#08090d] text-white">
        <I18nProvider initialLocale={initialLocale}>
          <MaintenanceGate>{children}</MaintenanceGate>
        </I18nProvider>
      </body>
    </html>
  );
}

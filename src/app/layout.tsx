import type { Metadata } from "next";
import { MaintenanceGate } from "@/components/maintenance/MaintenanceGate";
import { activeBrand } from "@/config/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: activeBrand.seo.title,
  description: activeBrand.seo.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#08090d] text-white">
        <MaintenanceGate>{children}</MaintenanceGate>
      </body>
    </html>
  );
}

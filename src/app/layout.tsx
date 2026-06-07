import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShadowEdge",
  description: "AI creative workspace for image and video generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#08090d] text-white">{children}</body>
    </html>
  );
}

import type { BrandConfig } from "@/config/brand";

export const newbrandBrand: BrandConfig = {
  id: "newbrand",
  name: "Gold-Tide AI",
  shortName: "Gold-Tide",
  slogan: "Premium AI Creative Studio",
  domain: "gold-tide.com",
  appUrl: "https://gold-tide.com",
  supportEmail: "support@gold-tide.com",
  assets: {
    logo: "/brands/newbrand/logo.png",
    mark: "/brands/newbrand/mark.png",
    favicon: "/brands/newbrand/favicon.ico",
  },
  seo: {
    title: "Gold-Tide AI",
    description: "Premium AI creative studio for image, video, and prompt generation.",
  },
  theme: {
    accent: "#D9B56D",
    accentSoft: "#F2D899",
    accentDeep: "#9B6B2F",
  },
  copy: {
    backendNotice: "Calls stay routed through the configured API.",
    statusLabel: "Gold-Tide AI Status",
  },
};

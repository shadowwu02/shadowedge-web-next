import type { BrandConfig } from "@/config/brand";

export const newbrandBrand: BrandConfig = {
  id: "newbrand",
  name: "NewBrand AI",
  shortName: "NewBrand",
  slogan: "AI Creative Studio",
  domain: "newbrand.example.com",
  appUrl: "https://newbrand.example.com",
  supportEmail: "support@example.com",
  assets: {
    logo: "/brands/newbrand/logo.png",
    mark: "/brands/newbrand/mark.png",
    favicon: "/brands/newbrand/favicon.ico",
  },
  seo: {
    title: "NewBrand AI",
    description: "AI creative workspace for image and video generation.",
  },
  theme: {
    accent: "#ffb44d",
    accentSoft: "#ffc35a",
    accentDeep: "#b86e22",
  },
  copy: {
    backendNotice: "Calls stay routed through the configured API.",
    statusLabel: "NewBrand AI Status",
  },
};

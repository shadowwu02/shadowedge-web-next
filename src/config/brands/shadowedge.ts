import type { BrandConfig } from "@/config/brand";

export const shadowedgeBrand: BrandConfig = {
  id: "shadowedge",
  name: "ShadowEdge",
  shortName: "ShadowEdge",
  slogan: "AI Studio",
  domain: "shadowedgeai.com",
  appUrl: "https://app.shadowedgeai.com",
  supportEmail: "support@shadowedgeai.com",
  assets: {
    logo: "/brands/shadowedge/logo.png",
    mark: "S",
    favicon: "/favicon.ico",
  },
  seo: {
    title: "ShadowEdge",
    description: "AI creative workspace for image and video generation.",
  },
  theme: {
    accent: "#ffb44d",
    accentSoft: "#ffc35a",
    accentDeep: "#b86e22",
  },
  copy: {
    backendNotice: "Calls stay routed through the existing ShadowEdge VPS API.",
    statusLabel: "ShadowEdge Status",
  },
};

import { newbrandBrand } from "@/config/brands/newbrand";
import { shadowedgeBrand } from "@/config/brands/shadowedge";

export type BrandId = "shadowedge" | "newbrand";

export type BrandConfig = {
  id: BrandId;
  name: string;
  shortName: string;
  slogan: string;
  domain: string;
  appUrl: string;
  supportEmail: string;
  assets: {
    logo: string;
    mark: string;
    favicon: string;
  };
  seo: {
    title: string;
    description: string;
  };
  theme: {
    accent: string;
    accentSoft: string;
    accentDeep: string;
  };
  copy: {
    backendNotice: string;
    statusLabel: string;
  };
};

const brands: Record<BrandId, BrandConfig> = {
  newbrand: newbrandBrand,
  shadowedge: shadowedgeBrand,
};

export function getBrandConfig(brandId = process.env.NEXT_PUBLIC_BRAND) {
  const normalized = String(brandId || "").trim().toLowerCase();

  if (normalized in brands) {
    return brands[normalized as BrandId];
  }

  return brands.shadowedge;
}

export const activeBrand = getBrandConfig();

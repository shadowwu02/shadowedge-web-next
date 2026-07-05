import { activeBrand } from "@/config/brand";
import { apiRequest } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";

export type MaintenanceScope = "all" | "image" | "video" | "upload";

export type MaintenanceMode = {
  enabled: boolean;
  title: string;
  message: string;
  estimatedRestoreAt?: string;
  allowAdminBypass: boolean;
  scope?: MaintenanceScope;
};

export const DEFAULT_MAINTENANCE_MODE: MaintenanceMode = {
  enabled: false,
  title: `${activeBrand.name} is under maintenance`,
  message: `We are upgrading ${activeBrand.name}. Please check back soon.`,
  estimatedRestoreAt: "",
  allowAdminBypass: true,
  scope: "all",
};

export async function getMaintenanceMode() {
  const envelope = await apiRequest<{ maintenance?: MaintenanceMode }>("/api/site-settings/maintenance", {
    token: "",
    cache: "no-store",
  });
  return envelope.data?.maintenance || DEFAULT_MAINTENANCE_MODE;
}

export async function canBypassMaintenanceAsAdmin() {
  const token = getStoredAuthToken();
  if (!token) return false;

  try {
    await apiRequest("/api/admin/me", {
      token,
      cache: "no-store",
    });
    return true;
  } catch {
    return false;
  }
}

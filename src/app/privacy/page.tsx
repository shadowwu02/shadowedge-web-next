import type { Metadata } from "next";
import { CommercialBetaLegalPage } from "@/components/legal/CommercialBetaLegalPage";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Privacy Policy | ShadowEdge",
  description: "Privacy information for the ShadowEdge Commercial Beta.",
};

export default function PrivacyPage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <CommercialBetaLegalPage kind="privacy" />
    </AppShell>
  );
}

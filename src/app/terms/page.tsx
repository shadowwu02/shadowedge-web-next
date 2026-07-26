import type { Metadata } from "next";
import { CommercialBetaLegalPage } from "@/components/legal/CommercialBetaLegalPage";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Terms of Service | ShadowEdge",
  description: "Terms for the ShadowEdge Commercial Beta.",
};

export default function TermsPage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <CommercialBetaLegalPage kind="terms" />
    </AppShell>
  );
}

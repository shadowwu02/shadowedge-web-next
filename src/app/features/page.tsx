import { AppShell } from "@/components/layout/AppShell";
import { FeaturesMarketingPage } from "@/components/marketing/MarketingSupportPages";

export default function FeaturesPage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <FeaturesMarketingPage />
    </AppShell>
  );
}

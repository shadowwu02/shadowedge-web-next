import { AppShell } from "@/components/layout/AppShell";
import { FaqMarketingPage } from "@/components/marketing/MarketingSupportPages";

export default function FaqPage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <FaqMarketingPage />
    </AppShell>
  );
}

import { AppShell } from "@/components/layout/AppShell";
import { ContactMarketingPage } from "@/components/marketing/MarketingSupportPages";

export default function ContactPage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <ContactMarketingPage />
    </AppShell>
  );
}

import { AppShell } from "@/components/layout/AppShell";
import { PricingBillingPage } from "@/components/pricing/PricingBillingPage";

export default function PricingPage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <PricingBillingPage />
    </AppShell>
  );
}

import { AppShell } from "@/components/layout/AppShell";
import { DemoProjectWorkspace } from "@/features/dashboard/components/DemoProjectWorkspace";

export default function DashboardDemoPage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <DemoProjectWorkspace />
    </AppShell>
  );
}

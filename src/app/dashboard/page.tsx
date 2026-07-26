import { AppShell } from "@/components/layout/AppShell";
import { UserDashboard } from "@/features/dashboard/components/UserDashboard";

export default function DashboardPage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <UserDashboard />
    </AppShell>
  );
}

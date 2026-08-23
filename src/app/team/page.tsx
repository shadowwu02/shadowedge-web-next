import { AppShell } from "@/components/layout/AppShell";
import { TeamManagementPage } from "@/components/team/TeamManagementPage";

export default function TeamPage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <TeamManagementPage />
    </AppShell>
  );
}

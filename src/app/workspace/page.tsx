import { AppShell } from "@/components/layout/AppShell";
import { WorkspaceCenter } from "@/features/workspace/components/WorkspaceCenter";

export default function WorkspacePage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <WorkspaceCenter />
    </AppShell>
  );
}

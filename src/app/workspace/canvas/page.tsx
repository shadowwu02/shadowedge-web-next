import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { AppShell } from "@/components/layout/AppShell";

export default function CanvasWorkspacePage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <CanvasWorkspace />
    </AppShell>
  );
}

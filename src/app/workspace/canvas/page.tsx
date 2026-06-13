import { CanvasPlaceholderPage } from "@/components/canvas/CanvasPlaceholderPage";
import { AppShell } from "@/components/layout/AppShell";

export default function CanvasWorkspacePage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <CanvasPlaceholderPage />
    </AppShell>
  );
}

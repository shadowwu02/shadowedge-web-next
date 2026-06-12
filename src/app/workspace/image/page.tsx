import { AppShell } from "@/components/layout/AppShell";
import { ImageWorkspace } from "@/components/image/ImageWorkspace";

export default function ImageWorkspacePage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <ImageWorkspace />
    </AppShell>
  );
}

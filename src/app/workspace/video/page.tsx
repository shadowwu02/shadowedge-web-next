import { AppShell } from "@/components/layout/AppShell";
import { VideoWorkspace } from "@/components/video/VideoWorkspace";

export default function VideoWorkspacePage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <VideoWorkspace />
    </AppShell>
  );
}

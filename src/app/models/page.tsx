import { AppShell } from "@/components/layout/AppShell";
import { ModelLibraryPage } from "@/components/models/ModelLibraryPage";

export default function ModelsPage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <ModelLibraryPage />
    </AppShell>
  );
}

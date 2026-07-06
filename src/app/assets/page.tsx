import { AssetLibraryPage } from "@/components/assets/AssetLibraryPage";
import { AppShell } from "@/components/layout/AppShell";

export default function AssetsPage() {
  return (
    <AppShell hideSidebar workspaceNav>
      <AssetLibraryPage />
    </AppShell>
  );
}

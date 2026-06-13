import { HomePage } from "@/components/home/HomePage";
import { AppShell } from "@/components/layout/AppShell";

export default function Home() {
  return (
    <AppShell hideSidebar workspaceNav>
      <HomePage />
    </AppShell>
  );
}

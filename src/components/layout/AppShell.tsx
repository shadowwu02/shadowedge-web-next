import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  hideSidebar = false,
  workspaceNav = false,
}: {
  children: ReactNode;
  hideSidebar?: boolean;
  workspaceNav?: boolean;
}) {
  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(255,180,77,.13),transparent_34%),#08090d] text-white">
      {hideSidebar ? null : <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar workspaceNav={workspaceNav} />
        <main className={cn("min-h-0 flex-1 overflow-hidden", hideSidebar ? "p-2.5 md:p-3" : "p-3 md:p-4")}>
          {children}
        </main>
      </div>
    </div>
  );
}

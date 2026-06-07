import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(255,180,77,.13),transparent_34%),#08090d] text-white">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-hidden p-3 md:p-4">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useI18n } from "@/i18n/useI18n";
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
  const { locale, setLocale, t } = useI18n();
  const workspaceLinks = [
    { label: t("nav.video"), href: "/workspace/video", active: true },
    { label: t("nav.image"), href: "/workspace/image" },
    { label: t("nav.canvas"), href: "/workspace/canvas" },
    { label: t("nav.history"), href: "/history" },
    { label: t("nav.models"), href: "/models" },
    { label: t("nav.pricing"), href: "/pricing" },
  ];
  const userLabels = {
    logout: t("account.logout"),
    signIn: t("account.signIn"),
    signedIn: t("account.signedIn"),
    videoWorkspace: t("account.videoWorkspace"),
  };

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(255,180,77,.13),transparent_34%),#08090d] text-white">
      {hideSidebar ? null : <Sidebar items={workspaceLinks} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          creditLabel={t("account.credits")}
          locale={locale}
          onLocaleChange={setLocale}
          userLabels={userLabels}
          workspaceLabels={{
            title: t("nav.workspace"),
            videoCreator: t("nav.videoCreator"),
          }}
          workspaceLinks={workspaceLinks}
          workspaceNav={workspaceNav}
        />
        <main className={cn("min-h-0 flex-1 overflow-hidden", hideSidebar ? "p-2.5 md:p-3" : "p-3 md:p-4")}>
          {children}
        </main>
      </div>
    </div>
  );
}

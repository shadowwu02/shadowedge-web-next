"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname() || "/workspace/video";
  const isActiveRoute = (href: string) => {
    if (href === "/workspace/video") return pathname === href || pathname.startsWith(`${href}/`);
    if (href === "/workspace/image") return pathname === href || pathname.startsWith(`${href}/`);
    if (href === "/workspace/canvas") return pathname === href || pathname.startsWith(`${href}/`);
    if (href === "/prompt-studio") return pathname === href || pathname.startsWith(`${href}/`);
    return pathname === href;
  };
  const workspaceLinks = [
    { label: t("nav.video"), href: "/workspace/video", active: isActiveRoute("/workspace/video") },
    { label: t("nav.image"), href: "/workspace/image", active: isActiveRoute("/workspace/image") },
    { label: t("nav.promptStudio"), href: "/prompt-studio", active: isActiveRoute("/prompt-studio") },
    { label: t("nav.canvas"), href: "/workspace/canvas", active: isActiveRoute("/workspace/canvas") },
    { label: t("nav.history"), href: "/history", active: isActiveRoute("/history") },
    { label: t("nav.models"), href: "/models", active: isActiveRoute("/models") },
    { label: t("nav.pricing"), href: "/pricing", active: isActiveRoute("/pricing") },
    { label: t("nav.account"), href: "/account", active: isActiveRoute("/account") },
  ];
  const userLabels = {
    logout: t("account.logout"),
    signIn: t("account.signIn"),
    signUp: t("auth.signUp"),
    signedIn: t("account.signedIn"),
    videoWorkspace: t("account.videoWorkspace"),
  };
  const signInNext = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/workspace/video";

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(255,180,77,.13),transparent_34%),#08090d] text-white">
      {hideSidebar ? null : <Sidebar items={workspaceLinks} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          creditLabel={t("account.credits")}
          locale={locale}
          onLocaleChange={setLocale}
          signInNext={signInNext}
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

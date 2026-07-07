"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { activeBrand } from "@/config/brand";
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
  const isGoldTideWorkspace = activeBrand.id === "newbrand" && (pathname.startsWith("/workspace") || pathname.startsWith("/prompt-studio"));
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
    <div
      className={cn(
        "relative flex h-screen min-h-0 overflow-hidden text-white",
        isGoldTideWorkspace
          ? "bg-[linear-gradient(135deg,#070707_0%,#0b0b0a_46%,#12100b_100%)]"
          : "bg-[radial-gradient(circle_at_top_right,rgba(255,180,77,.13),transparent_34%),#08090d]",
      )}
      data-brand-surface={isGoldTideWorkspace ? "gold-tide-workspace" : undefined}
    >
      {isGoldTideWorkspace ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(217,181,109,.045)_0,transparent_18%,transparent_82%,rgba(217,181,109,.035)_100%)]"
        />
      ) : null}
      {hideSidebar ? null : <Sidebar goldTideShell={isGoldTideWorkspace} items={workspaceLinks} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          creditLabel={t("account.credits")}
          goldTideShell={isGoldTideWorkspace}
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
        <main
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden",
            isGoldTideWorkspace ? "bg-[linear-gradient(180deg,rgba(217,181,109,.028),transparent_24%)]" : "",
            hideSidebar ? "p-2.5 md:p-3" : "p-3 md:p-4",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

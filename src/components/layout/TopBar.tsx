"use client";

import Image from "next/image";
import Link from "next/link";
import { CreditBadge } from "@/components/common/CreditBadge";
import { LanguageSwitch } from "@/components/common/LanguageSwitch";
import { UserAvatar, type UserAvatarLabels } from "@/components/common/UserAvatar";
import { activeBrand } from "@/config/brand";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useCredits } from "@/hooks/useCredits";
import type { Locale } from "@/i18n/dictionary";
import { cn } from "@/lib/utils";

export type WorkspaceNavItem = {
  active?: boolean;
  href: string;
  label: string;
};

export function TopBar({
  creditLabel,
  locale,
  onLocaleChange,
  signInNext,
  userLabels,
  workspaceLabels,
  workspaceLinks,
  workspaceNav = false,
  goldTideShell = false,
}: {
  creditLabel: string;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  signInNext?: string;
  userLabels: UserAvatarLabels;
  workspaceLabels: {
    title: string;
    videoCreator: string;
  };
  workspaceLinks: WorkspaceNavItem[];
  workspaceNav?: boolean;
  goldTideShell?: boolean;
}) {
  const { profile } = useAuthSession();
  const { credits } = useCredits();

  return (
    <header
      className={cn(
        "relative flex min-h-14 shrink-0 items-center justify-between gap-4 overflow-visible border-b px-3 backdrop-blur-xl md:px-4",
        goldTideShell
          ? "border-[#d9b56d]/14 bg-[#080806]/95 shadow-[0_1px_0_rgba(217,181,109,.08),0_18px_48px_rgba(0,0,0,.18)]"
          : "border-[rgba(244,244,244,0.08)] bg-[#05070b]/94",
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <Link
          href="/"
          className={cn(
            "flex shrink-0 items-center gap-2.5",
            goldTideShell ? "rounded-full border border-[#d9b56d]/10 bg-[#d9b56d]/[.035] p-1.5 pr-3 shadow-inner shadow-[#d9b56d]/[.03]" : "",
          )}
        >
          <Image
            alt={activeBrand.name}
            className={cn("h-8 w-auto object-contain", goldTideShell ? "max-w-[170px]" : "max-w-[150px]")}
            height={40}
            priority
            src={activeBrand.assets.logo}
            width={136}
          />
          <span
            className={cn(
              "hidden text-[10px] font-medium uppercase tracking-[.18em] sm:block",
              goldTideShell ? "text-[#d9b56d]/62" : "text-[#b9b9b9]/42",
            )}
          >
            {activeBrand.slogan}
          </span>
        </Link>

        {workspaceNav ? (
          <nav className="se-scrollbar hidden min-w-0 max-w-[56vw] items-center gap-1 overflow-x-auto lg:flex">
            {workspaceLinks.map((item) => (
              <Link
                className={cn(
                  "shrink-0 rounded-full px-3 py-2 text-[13px] transition-colors",
                  goldTideShell
                    ? "border text-[#d8d0c0]/74 shadow-inner shadow-white/[.015]"
                    : "se-segmented-item font-medium",
                  goldTideShell && item.active
                    ? "border-[#d9b56d]/55 bg-[#d9b56d]/16 font-semibold text-[#f2d899] shadow-[0_10px_26px_rgba(217,181,109,.10)]"
                    : "",
                  goldTideShell && !item.active
                    ? "border-white/7 bg-[#0f1114]/58 hover:border-[#d9b56d]/26 hover:bg-[#d9b56d]/8 hover:text-[#f2d899]"
                    : "",
                  !goldTideShell && item.active ? "se-segmented-item-active" : "",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : (
          <div>
            <p className={cn("text-xs font-semibold uppercase tracking-[.18em]", goldTideShell ? "text-[#d9b56d]" : "text-[#ffcf83]")}>{workspaceLabels.title}</p>
            <h1 className="text-lg font-semibold text-[#f4f4f4] md:text-xl">{workspaceLabels.videoCreator}</h1>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 overflow-visible md:gap-3">
        <CreditBadge credits={credits} label={creditLabel} variant={goldTideShell ? "goldTide" : "default"} />
        <LanguageSwitch locale={locale} onChange={onLocaleChange} />
        {profile?.email ? (
          <span
            className={cn(
              "hidden max-w-[190px] truncate rounded-full border px-3 py-2 text-xs font-medium md:inline-block",
              goldTideShell ? "border-[#d9b56d]/14 bg-[#0f0e0b]/72 text-[#d8d0c0]/68" : "border-[rgba(244,244,244,0.08)] bg-[#111318]/74 text-[#b9b9b9]/68",
            )}
          >
            {profile.email}
          </span>
        ) : null}
        <UserAvatar email={profile?.email} labels={userLabels} name={profile?.name} signInNext={signInNext} />
      </div>
    </header>
  );
}

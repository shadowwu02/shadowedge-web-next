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
}) {
  const { profile } = useAuthSession();
  const { credits } = useCredits();

  return (
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-4 border-b border-[rgba(244,244,244,0.08)] bg-[#05070b]/94 px-3 backdrop-blur-xl md:px-4">
      <div className="flex min-w-0 items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image
            alt={activeBrand.name}
            className="h-8 w-auto max-w-[150px] object-contain"
            height={40}
            priority
            src={activeBrand.assets.logo}
            width={136}
          />
          <span className="hidden text-[10px] font-medium uppercase tracking-[.18em] text-[#b9b9b9]/42 sm:block">
            {activeBrand.slogan}
          </span>
        </Link>

        {workspaceNav ? (
          <nav className="se-scrollbar hidden min-w-0 max-w-[56vw] items-center gap-1 overflow-x-auto lg:flex">
            {workspaceLinks.map((item) => (
              <Link
                className={cn(
                  "se-segmented-item shrink-0 rounded-full px-3 py-2 text-[13px] font-medium",
                  item.active ? "se-segmented-item-active" : "",
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
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#ffcf83]">{workspaceLabels.title}</p>
            <h1 className="text-lg font-semibold text-[#f4f4f4] md:text-xl">{workspaceLabels.videoCreator}</h1>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <CreditBadge credits={credits} label={creditLabel} />
        <LanguageSwitch locale={locale} onChange={onLocaleChange} />
        {profile?.email ? (
          <span className="hidden max-w-[190px] truncate rounded-full border border-[rgba(244,244,244,0.08)] bg-[#111318]/74 px-3 py-2 text-xs font-medium text-[#b9b9b9]/68 md:inline-block">
            {profile.email}
          </span>
        ) : null}
        <UserAvatar email={profile?.email} labels={userLabels} name={profile?.name} signInNext={signInNext} />
      </div>
    </header>
  );
}

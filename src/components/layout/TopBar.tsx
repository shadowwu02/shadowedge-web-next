"use client";

import Image from "next/image";
import Link from "next/link";
import { CreditBadge } from "@/components/common/CreditBadge";
import { LanguageSwitch } from "@/components/common/LanguageSwitch";
import { UserAvatar, type UserAvatarLabels } from "@/components/common/UserAvatar";
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
  userLabels,
  workspaceLabels,
  workspaceLinks,
  workspaceNav = false,
}: {
  creditLabel: string;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
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
            alt="ShadowEdge"
            className="h-8 w-auto max-w-[150px] object-contain"
            height={40}
            priority
            src="/brand/shadowedge-logo.png"
            width={136}
          />
          <span className="hidden text-[10px] font-medium uppercase tracking-[.18em] text-[#b9b9b9]/42 sm:block">
            AI Studio
          </span>
        </Link>

        {workspaceNav ? (
          <nav className="hidden min-w-0 items-center gap-1 lg:flex">
            {workspaceLinks.map((item) => (
              <Link
                className={cn(
                  "rounded-full px-3 py-2 text-[13px] font-medium transition-colors",
                  item.active
                    ? "border border-[#ffb44d]/26 bg-[#ffb44d]/10 text-[#ffb44d] shadow-inner shadow-[#ffb44d]/5"
                    : "border border-transparent text-[#b9b9b9]/66 hover:border-[rgba(244,244,244,0.08)] hover:bg-[#1a1c22]/72 hover:text-[#f4f4f4]",
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
        <UserAvatar email={profile?.email} labels={userLabels} name={profile?.name} />
      </div>
    </header>
  );
}

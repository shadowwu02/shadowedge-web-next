"use client";

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
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#08090d]/92 px-3 backdrop-blur-xl md:px-4">
      <div className="flex min-w-0 items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-2xl bg-[#ffb44d] text-base font-black text-[#1f2027]">
            S
          </span>
          <span className="hidden sm:block">
            <span className="block text-base font-black tracking-tight text-white">ShadowEdge</span>
            <span className="block text-[10px] font-bold uppercase tracking-[.18em] text-white/42">AI Studio</span>
          </span>
        </Link>

        {workspaceNav ? (
          <nav className="hidden min-w-0 items-center gap-1 lg:flex">
            {workspaceLinks.map((item) => (
              <Link
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-bold transition",
                  item.active
                    ? "bg-white/[.075] text-[#ffd08a]"
                    : "text-white/56 hover:bg-white/[.055] hover:text-white",
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
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#ffcf83]">{workspaceLabels.title}</p>
            <h1 className="text-lg font-black text-white md:text-xl">{workspaceLabels.videoCreator}</h1>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <CreditBadge credits={credits} label={creditLabel} />
        <LanguageSwitch locale={locale} onChange={onLocaleChange} />
        {profile?.email ? (
          <span className="hidden max-w-[190px] truncate rounded-full border border-white/10 bg-white/[.045] px-3 py-2 text-xs font-bold text-white/58 md:inline-block">
            {profile.email}
          </span>
        ) : null}
        <UserAvatar email={profile?.email} labels={userLabels} name={profile?.name} />
      </div>
    </header>
  );
}

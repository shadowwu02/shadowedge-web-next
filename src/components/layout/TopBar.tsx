"use client";

import { CreditBadge } from "@/components/common/CreditBadge";
import { LanguageSwitch } from "@/components/common/LanguageSwitch";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useCredits } from "@/hooks/useCredits";
import { useI18n } from "@/i18n/useI18n";

export function TopBar() {
  const { locale, setLocale } = useI18n();
  const { profile } = useAuthSession();
  const { credits } = useCredits();

  return (
    <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#08090d]/92 px-4 backdrop-blur-xl md:px-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#ffcf83]">Workspace</p>
        <h1 className="text-lg font-black text-white md:text-xl">Video Creator</h1>
      </div>
      <div className="flex items-center gap-3">
        <CreditBadge credits={credits} />
        <LanguageSwitch locale={locale} onChange={setLocale} />
        {profile?.email ? (
          <span className="hidden max-w-[220px] truncate rounded-full border border-white/10 bg-white/[.045] px-3 py-2 text-xs font-bold text-white/58 md:inline-block">
            {profile.email}
          </span>
        ) : null}
        <UserAvatar email={profile?.email} name={profile?.name} />
      </div>
    </header>
  );
}

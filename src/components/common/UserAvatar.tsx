"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearAuthSession } from "@/lib/auth";

export type UserAvatarLabels = {
  logout: string;
  signIn: string;
  signedIn: string;
  videoWorkspace: string;
};

const defaultLabels: UserAvatarLabels = {
  logout: "Logout",
  signIn: "Sign in",
  signedIn: "Signed in",
  videoWorkspace: "Video workspace",
};

export function UserAvatar({
  email,
  labels = defaultLabels,
  name,
}: {
  email?: string;
  labels?: UserAvatarLabels;
  name?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const label = name || email || "Guest";
  const initial = label.trim().charAt(0).toUpperCase() || "S";

  if (!email) {
    return (
      <Link
        className="inline-flex h-10 items-center justify-center rounded-full border border-[#ffb44d]/45 bg-[#ffb44d]/14 px-4 text-sm font-black text-[#ffd08a] transition hover:border-[#ffb44d]/70 hover:bg-[#ffb44d]/20"
        href="/sign-in?next=/workspace/video"
      >
        {labels.signIn}
      </Link>
    );
  }

  function handleLogout() {
    clearAuthSession();
    setIsOpen(false);
    router.replace("/sign-in?next=/workspace/video");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        className="grid size-10 place-items-center rounded-full border border-[#ffb44d]/45 bg-[#ffb44d]/18 text-sm font-black text-[#ffd08a] shadow-lg shadow-black/20 transition hover:border-[#ffb44d]/70 hover:bg-[#ffb44d]/24"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
        title={email}
      >
        {initial}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-3xl border border-white/10 bg-[#11141d] p-3 shadow-2xl shadow-black/45">
          <div className="rounded-2xl bg-white/[.055] px-3 py-2">
            <p className="truncate text-xs font-bold uppercase tracking-[.14em] text-white/38">{labels.signedIn}</p>
            <p className="mt-1 truncate text-sm font-bold text-white">{email}</p>
          </div>
          <Link
            className="mt-2 block rounded-2xl px-3 py-2 text-sm font-bold text-white/68 transition hover:bg-white/[.055] hover:text-white"
            href="/workspace/video"
            onClick={() => setIsOpen(false)}
          >
            {labels.videoWorkspace}
          </Link>
          <button
            className="mt-1 w-full rounded-2xl px-3 py-2 text-left text-sm font-bold text-red-100 transition hover:bg-red-400/10"
            onClick={handleLogout}
            type="button"
          >
            {labels.logout}
          </button>
        </div>
      ) : null}
    </div>
  );
}

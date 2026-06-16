"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearAuthSession } from "@/lib/auth";

export type UserAvatarLabels = {
  logout: string;
  signIn: string;
  signUp: string;
  signedIn: string;
  videoWorkspace: string;
};

const defaultLabels: UserAvatarLabels = {
  logout: "Logout",
  signIn: "Sign in",
  signUp: "Sign up",
  signedIn: "Signed in",
  videoWorkspace: "Video workspace",
};

export function UserAvatar({
  email,
  labels = defaultLabels,
  name,
  signInNext = "/workspace/video",
}: {
  email?: string;
  labels?: UserAvatarLabels;
  name?: string;
  signInNext?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const label = name || email || "Guest";
  const initial = label.trim().charAt(0).toUpperCase() || "S";
  const safeSignInNext = signInNext.startsWith("/") && !signInNext.startsWith("//") ? signInNext : "/workspace/video";
  const signInHref = `/sign-in?next=${encodeURIComponent(safeSignInNext)}`;
  const signUpHref = `/sign-up?next=${encodeURIComponent(safeSignInNext)}`;

  if (!email) {
    return (
      <div className="flex items-center gap-2">
        <Link
          className="se-button-secondary hidden h-10 items-center justify-center rounded-full px-4 text-[13px] font-semibold sm:inline-flex"
          href={signInHref}
        >
          {labels.signIn}
        </Link>
        <Link
          className="se-button-primary inline-flex h-10 items-center justify-center rounded-full px-4 text-[13px] font-semibold"
          href={signUpHref}
        >
          {labels.signUp}
        </Link>
      </div>
    );
  }

  function handleLogout() {
    clearAuthSession();
    setIsOpen(false);
    router.replace(signInHref);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        className="se-icon-button-primary grid size-10 place-items-center text-sm font-semibold"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
        title={email}
      >
        {initial}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-[24px] border border-[rgba(244,244,244,0.08)] bg-[#111318]/98 p-2.5 shadow-2xl shadow-black/45 backdrop-blur-xl">
          <div className="rounded-[18px] border border-[rgba(244,244,244,0.06)] bg-[#1a1c22]/68 px-3 py-2">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[.13em] text-[#b9b9b9]/42">{labels.signedIn}</p>
            <p className="mt-1 truncate text-sm font-semibold text-[#f4f4f4]">{email}</p>
          </div>
          <Link
            className="mt-2 block rounded-[18px] px-3 py-2 text-sm font-medium text-[#b9b9b9]/72 transition-colors hover:bg-[#1a1c22]/72 hover:text-[#f4f4f4]"
            href="/workspace/video"
            onClick={() => setIsOpen(false)}
          >
            {labels.videoWorkspace}
          </Link>
          <button
            className="mt-1 w-full rounded-[18px] px-3 py-2 text-left text-sm font-medium text-red-100/82 transition-colors hover:bg-[#2a1012] hover:text-red-100"
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

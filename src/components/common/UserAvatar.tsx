"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
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

const accountMenuWidth = 256;
const accountMenuGap = 8;
const viewportPadding = 12;

type AccountMenuPosition = {
  left: number;
  top: number;
  width: number;
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
  const [menuPosition, setMenuPosition] = useState<AccountMenuPosition>({ left: viewportPadding, top: viewportPadding, width: accountMenuWidth });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const label = name || email || "Guest";
  const initial = label.trim().charAt(0).toUpperCase() || "S";
  const safeSignInNext = signInNext.startsWith("/") && !signInNext.startsWith("//") ? signInNext : "/workspace/video";
  const signInHref = `/sign-in?next=${encodeURIComponent(safeSignInNext)}`;
  const signUpHref = `/sign-up?next=${encodeURIComponent(safeSignInNext)}`;

  useEffect(() => {
    if (!isOpen) return;

    function updateMenuPosition() {
      const trigger = buttonRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(accountMenuWidth, Math.max(220, window.innerWidth - viewportPadding * 2));
      const menuHeight = menuRef.current?.offsetHeight || 190;
      const preferredLeft = rect.right - width;
      const preferredTop = rect.bottom + accountMenuGap;
      const top =
        preferredTop + menuHeight > window.innerHeight - viewportPadding && rect.top - menuHeight - accountMenuGap > viewportPadding
          ? rect.top - menuHeight - accountMenuGap
          : preferredTop;

      setMenuPosition({
        left: Math.max(viewportPadding, Math.min(preferredLeft, window.innerWidth - width - viewportPadding)),
        top: Math.max(viewportPadding, Math.min(top, window.innerHeight - menuHeight - viewportPadding)),
        width,
      });
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && buttonRef.current?.contains(target)) return;
      if (target && menuRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    const frame = window.requestAnimationFrame(updateMenuPosition);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

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

  const accountMenu =
    isOpen && typeof document !== "undefined" ? (
      <div
        className="fixed z-[2200] rounded-[24px] border border-[rgba(244,244,244,0.08)] bg-[#111318]/98 p-2.5 shadow-2xl shadow-black/45 backdrop-blur-xl"
        ref={menuRef}
        style={{ left: menuPosition.left, top: menuPosition.top, width: menuPosition.width }}
      >
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
    ) : null;

  return (
    <div className="relative overflow-visible">
      <button
        aria-expanded={isOpen}
        className="se-icon-button-primary grid size-10 place-items-center text-sm font-semibold"
        onClick={() => setIsOpen((current) => !current)}
        ref={buttonRef}
        type="button"
        title={email}
      >
        {initial}
      </button>

      {accountMenu ? createPortal(accountMenu, document.body) : null}
    </div>
  );
}

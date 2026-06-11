"use client";

import type { UploadMediaType } from "@/types/video";
import { cn } from "@/lib/utils";

export function MediaTypeIcon({
  className,
  type,
}: {
  className?: string;
  type: UploadMediaType;
}) {
  if (type === "video") {
    return (
      <svg aria-hidden="true" className={cn("size-5", className)} fill="none" viewBox="0 0 24 24">
        <path
          d="M4.75 7.5c0-1.38 1.12-2.5 2.5-2.5h7.5c1.38 0 2.5 1.12 2.5 2.5v9c0 1.38-1.12 2.5-2.5 2.5h-7.5a2.5 2.5 0 0 1-2.5-2.5v-9Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="m17.25 9.75 2.85-1.55c.67-.36 1.4.12 1.4.88v5.84c0 .76-.73 1.24-1.4.88l-2.85-1.55v-4.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path d="M10 9.05v5.9l4.7-2.95L10 9.05Z" fill="currentColor" />
      </svg>
    );
  }

  if (type === "audio") {
    return (
      <svg aria-hidden="true" className={cn("size-5", className)} fill="none" viewBox="0 0 24 24">
        <path
          d="M5 14.75V9.25M9.67 17.5v-11M14.33 15.75v-7.5M19 13.25v-2.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path d="M3.5 12h17" stroke="currentColor" strokeLinecap="round" strokeOpacity=".35" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={cn("size-5", className)} fill="none" viewBox="0 0 24 24">
      <path
        d="M5.5 5.25h13c1.24 0 2.25 1.01 2.25 2.25v9c0 1.24-1.01 2.25-2.25 2.25h-13A2.25 2.25 0 0 1 3.25 16.5v-9c0-1.24 1.01-2.25 2.25-2.25Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="m4 16.35 4.05-4.18a1.35 1.35 0 0 1 1.97.04l2.2 2.42 1.45-1.45a1.36 1.36 0 0 1 1.9-.03l4.24 3.95" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="15.85" cy="8.65" r="1.45" fill="currentColor" />
    </svg>
  );
}

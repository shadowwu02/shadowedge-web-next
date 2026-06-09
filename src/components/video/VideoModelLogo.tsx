"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getVideoModelLogo } from "@/lib/video/modelLogoMap";

type VideoModelLogoSize = "sm" | "md" | "lg";

const logoSizeClass: Record<VideoModelLogoSize, { image: string; shell: string; value: number }> = {
  lg: {
    image: "size-[22px]",
    shell: "size-9 rounded-[16px]",
    value: 28,
  },
  md: {
    image: "size-5",
    shell: "size-8 rounded-[14px]",
    value: 24,
  },
  sm: {
    image: "size-[13px]",
    shell: "size-5 rounded-[10px]",
    value: 18,
  },
};

function getInitials(label: string | undefined | null) {
  const value = label || "AI";
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function VideoModelLogo({
  className,
  label,
  lookup,
  size = "md",
}: {
  className?: string;
  label?: string | null;
  lookup?: string | null;
  size?: VideoModelLogoSize;
}) {
  const src = getVideoModelLogo(lookup);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const sizing = logoSizeClass[size];
  const logoSrc = src && src !== failedSrc ? src : null;

  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden border border-[rgba(244,244,244,0.22)] bg-[rgba(244,244,244,0.94)] text-[10px] font-semibold text-[#111318] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42),0_8px_22px_rgba(0,0,0,0.20)]",
        sizing.shell,
        className,
      )}
    >
      {logoSrc ? (
        <Image
          alt={`${label || "Video model"} logo`}
          className={cn("object-contain", sizing.image)}
          height={sizing.value}
          onError={() => setFailedSrc(logoSrc)}
          src={logoSrc}
          width={sizing.value}
        />
      ) : (
        <span aria-hidden="true" className="leading-none">
          {getInitials(label)}
        </span>
      )}
    </span>
  );
}

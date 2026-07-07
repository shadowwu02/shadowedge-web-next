import Image from "next/image";
import Link from "next/link";
import type { WorkspaceNavItem } from "@/components/layout/TopBar";
import { activeBrand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function Sidebar({
  goldTideShell = false,
  items,
}: {
  goldTideShell?: boolean;
  items: WorkspaceNavItem[];
}) {
  const hasImageMark = activeBrand.assets.mark.startsWith("/");

  return (
    <aside
      className={cn(
        "hidden min-h-0 w-[248px] shrink-0 border-r p-4 lg:flex lg:flex-col",
        goldTideShell
          ? "border-[#d9b56d]/14 bg-[#080806]/88 shadow-[inset_-1px_0_0_rgba(217,181,109,.05)]"
          : "border-[rgba(244,244,244,0.08)] bg-[#05070b]/84",
      )}
    >
      <Link href="/" className="mb-8 flex items-center gap-3 px-2">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-[18px] text-lg font-semibold text-[#16171c] shadow-lg",
            goldTideShell ? "border border-[#f2d899]/18 bg-[#d9b56d] shadow-[#d9b56d]/14" : "bg-[#ffb44d] shadow-[#ffb44d]/16",
          )}
        >
          {hasImageMark ? (
            <Image alt={`${activeBrand.name} mark`} className="h-6 w-6 object-contain" height={32} src={activeBrand.assets.mark} width={32} />
          ) : (
            activeBrand.assets.mark
          )}
        </span>
        <span>
          <span className="block text-lg font-semibold tracking-tight text-[#f4f4f4]">{activeBrand.shortName}</span>
          <span className={cn("block text-xs font-medium uppercase tracking-[.18em]", goldTideShell ? "text-[#d9b56d]/58" : "text-[#b9b9b9]/44")}>{activeBrand.slogan}</span>
        </span>
      </Link>

      <nav className="grid gap-2">
        {items.map((item) => (
          <Link
            className={cn(
              "rounded-[18px] border px-4 py-3 text-sm font-medium transition-colors",
              goldTideShell && item.active ? "border-[#d9b56d]/42 bg-[#d9b56d]/12 text-[#f2d899]" : "",
              goldTideShell && !item.active ? "border-transparent text-[#d8d0c0]/66 hover:border-[#d9b56d]/16 hover:bg-[#d9b56d]/8 hover:text-[#f4f4f4]" : "",
              !goldTideShell && item.active ? "border-[#ffb44d]/42 bg-[#ffb44d]/12 text-[#ffd08a]" : "",
              !goldTideShell && !item.active ? "border-transparent text-[#b9b9b9]/68 hover:border-[rgba(244,244,244,0.08)] hover:bg-[#1a1c22]/74 hover:text-[#f4f4f4]" : "",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div
        className={cn(
          "mt-auto rounded-[24px] border p-4 shadow-inner shadow-black/10",
          goldTideShell ? "border-[#d9b56d]/14 bg-[#11100d]/78" : "border-[rgba(244,244,244,0.08)] bg-[#111318]/74",
        )}
      >
        <p className={cn("text-xs font-semibold uppercase tracking-[.14em]", goldTideShell ? "text-[#d9b56d]/58" : "text-[#b9b9b9]/44")}>
          {goldTideShell ? "Studio Link" : "Backend"}
        </p>
        <p className={cn("mt-2 text-sm leading-6", goldTideShell ? "text-[#d8d0c0]/72" : "text-[#b9b9b9]/72")}>
          {activeBrand.copy.backendNotice}
        </p>
      </div>
    </aside>
  );
}

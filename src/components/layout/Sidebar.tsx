import Link from "next/link";
import type { WorkspaceNavItem } from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";

export function Sidebar({ items }: { items: WorkspaceNavItem[] }) {
  return (
    <aside className="hidden min-h-0 w-[248px] shrink-0 border-r border-[rgba(244,244,244,0.08)] bg-[#05070b]/78 p-4 lg:flex lg:flex-col">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2">
        <span className="grid size-10 place-items-center rounded-[18px] bg-[#ffb44d] text-lg font-semibold text-[#16171c] shadow-lg shadow-[#ffb44d]/18">
          S
        </span>
        <span>
          <span className="block text-lg font-semibold tracking-tight text-[#f4f4f4]">ShadowEdge</span>
          <span className="block text-xs font-semibold uppercase tracking-[.18em] text-[#b9b9b9]/48">AI Studio</span>
        </span>
      </Link>

      <nav className="grid gap-2">
        {items.map((item) => (
          <Link
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
              item.active
                ? "border-[#ffb44d]/50 bg-[#ffb44d]/14 text-[#ffd08a]"
                : "border-transparent text-[#b9b9b9]/68 hover:border-[rgba(244,244,244,0.08)] hover:bg-[#1a1c22]/74 hover:text-[#f4f4f4]",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-3xl border border-[rgba(244,244,244,0.08)] bg-[#111318]/74 p-4">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#b9b9b9]/46">Backend</p>
        <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/72">
          Calls stay routed through the existing ShadowEdge VPS API.
        </p>
      </div>
    </aside>
  );
}

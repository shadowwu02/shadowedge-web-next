import Link from "next/link";
import { cn } from "@/lib/utils";

const items = [
  { label: "Video", href: "/workspace/video", active: true },
  { label: "Image", href: "/workspace/image" },
  { label: "AI Canvas", href: "/workspace/canvas" },
  { label: "History", href: "/history" },
  { label: "Models", href: "/models" },
  { label: "Pricing", href: "/pricing" },
];

export function Sidebar() {
  return (
    <aside className="hidden min-h-0 w-[248px] shrink-0 border-r border-white/10 bg-black/20 p-4 lg:flex lg:flex-col">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2">
        <span className="grid size-10 place-items-center rounded-2xl bg-[#ffb44d] text-lg font-black text-[#1f2027]">
          S
        </span>
        <span>
          <span className="block text-lg font-black tracking-tight">ShadowEdge</span>
          <span className="block text-xs font-bold uppercase tracking-[.18em] text-white/42">AI Studio</span>
        </span>
      </Link>

      <nav className="grid gap-2">
        {items.map((item) => (
          <Link
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm font-extrabold transition",
              item.active
                ? "border-[#ffb44d]/50 bg-[#ffb44d]/14 text-[#ffd08a]"
                : "border-transparent text-white/62 hover:border-white/10 hover:bg-white/[.055] hover:text-white",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-3xl border border-white/10 bg-white/[.045] p-4">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-white/40">Backend</p>
        <p className="mt-2 text-sm leading-6 text-white/68">
          Calls stay routed through the existing ShadowEdge VPS API.
        </p>
      </div>
    </aside>
  );
}

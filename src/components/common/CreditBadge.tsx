import { formatCredits } from "@/lib/utils";

export function CreditBadge({ credits }: { credits?: number | null }) {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[.055] px-4 py-2 text-sm text-white/68 sm:inline-flex">
      <span className="size-2 rounded-full bg-[#ffb44d]" />
      <span className="font-bold text-white">{formatCredits(credits)}</span>
      <span>credits</span>
    </div>
  );
}

import { formatCredits } from "@/lib/utils";

export function CreditBadge({ credits, label = "credits" }: { credits?: number | null; label?: string }) {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-[rgba(244,244,244,0.08)] bg-[#111318]/76 px-3.5 py-2 text-[13px] text-[#b9b9b9]/68 shadow-inner shadow-black/15 sm:inline-flex">
      <span className="size-2 rounded-full bg-[#ffb44d] shadow-[0_0_14px_rgba(255,180,77,0.32)]" />
      <span className="font-semibold text-[#f4f4f4]">{formatCredits(credits)}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

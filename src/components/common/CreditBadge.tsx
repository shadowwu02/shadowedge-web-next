import { cn, formatCredits } from "@/lib/utils";

export function CreditBadge({
  credits,
  label = "credits",
  variant = "default",
}: {
  credits?: number | null;
  label?: string;
  variant?: "default" | "goldTide";
}) {
  const isGoldTide = variant === "goldTide";

  return (
    <div
      className={cn(
        "hidden items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] shadow-inner shadow-black/15 sm:inline-flex",
        isGoldTide
          ? "border-[#d9b56d]/16 bg-[#0f0e0b]/82 text-[#d8d0c0]/68"
          : "border-[rgba(244,244,244,0.08)] bg-[#111318]/76 text-[#b9b9b9]/68",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          isGoldTide ? "bg-[#d9b56d] shadow-[0_0_14px_rgba(217,181,109,0.34)]" : "bg-[#ffb44d] shadow-[0_0_14px_rgba(255,180,77,0.32)]",
        )}
      />
      <span className="font-semibold text-[#f4f4f4]">{formatCredits(credits)}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

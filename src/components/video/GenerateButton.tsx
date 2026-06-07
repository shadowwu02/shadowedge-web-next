export function GenerateButton({
  disabled,
  isSubmitting,
  credits,
  onClick,
}: {
  disabled?: boolean;
  isSubmitting?: boolean;
  credits?: number;
  onClick: () => void;
}) {
  return (
    <button
      className="min-h-14 w-full rounded-2xl bg-[#ffb44d] px-5 text-base font-black text-[#1f2027] shadow-xl shadow-[#ffb44d]/10 transition hover:bg-[#ffc766] disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled || isSubmitting}
      onClick={onClick}
      type="button"
    >
      {isSubmitting ? "Submitting..." : `Generate${credits ? ` · ${credits} credits` : ""}`}
    </button>
  );
}

export function GenerateButton({
  disabled,
  isSubmitting,
  credits,
  label,
  onClick,
}: {
  disabled?: boolean;
  isSubmitting?: boolean;
  credits?: number;
  label?: string;
  onClick: () => void;
}) {
  const buttonLabel = label || (isSubmitting ? "Submitting..." : `Generate${credits ? ` · ${credits} credits` : ""}`);

  return (
    <button
      className="min-h-12 w-full rounded-2xl bg-[#ffb44d] px-5 text-sm font-black text-[#1f2027] shadow-xl shadow-[#ffb44d]/10 transition hover:bg-[#ffc766] disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled || isSubmitting}
      onClick={onClick}
      type="button"
    >
      {buttonLabel}
    </button>
  );
}

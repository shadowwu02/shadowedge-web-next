export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[.045] p-5 text-sm text-white/62">
      <span className="size-3 animate-pulse rounded-full bg-[#ffb44d]" />
      {label}
    </div>
  );
}

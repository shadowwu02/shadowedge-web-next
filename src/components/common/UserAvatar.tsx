export function UserAvatar({ email, name }: { email?: string; name?: string }) {
  const label = name || email || "Guest";
  const initial = label.trim().charAt(0).toUpperCase() || "S";

  return (
    <button
      className="grid size-10 place-items-center rounded-full border border-[#ffb44d]/45 bg-[#ffb44d]/18 text-sm font-black text-[#ffd08a] shadow-lg shadow-black/20"
      type="button"
      title={email || "Account"}
    >
      {initial}
    </button>
  );
}

export function ErrorState({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-red-300/25 bg-red-400/10 p-4 text-sm text-red-100 [overflow-wrap:anywhere]" role="alert">
      {message}
    </div>
  );
}

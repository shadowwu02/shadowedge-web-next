import { AppShell } from "@/components/layout/AppShell";

export default function AccountPage() {
  return (
    <AppShell>
      <div className="rounded-[28px] border border-white/10 bg-white/[.055] p-8">
        <h1 className="text-3xl font-black">Account</h1>
        <p className="mt-3 max-w-2xl text-white/60">Account settings are intentionally deferred in phase 1.</p>
      </div>
    </AppShell>
  );
}

import { AppShell } from "@/components/layout/AppShell";

export default function ImageWorkspacePage() {
  return (
    <AppShell>
      <div className="rounded-[28px] border border-white/10 bg-white/[.055] p-8">
        <h1 className="text-3xl font-black">Image Workspace</h1>
        <p className="mt-3 max-w-2xl text-white/60">
          Placeholder route for the next migration phase. The legacy image workspace remains live.
        </p>
      </div>
    </AppShell>
  );
}

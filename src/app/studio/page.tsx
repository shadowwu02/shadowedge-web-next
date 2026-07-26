import "@xyflow/react/dist/style.css";
import "@/features/studio/studio.css";
import { Suspense } from "react";
import { StudioWorkspace } from "@/features/studio/components/StudioWorkspace";

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#090909] text-sm font-bold text-white/45">Loading Studio…</div>}>
      <StudioWorkspace />
    </Suspense>
  );
}

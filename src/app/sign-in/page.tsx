import { Suspense } from "react";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,180,77,.16),transparent_34%),#08090d] px-5 py-8 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[.24em] text-[#ffcf83]">ShadowEdge Workspace</p>
          <h2 className="mt-5 text-5xl font-black leading-tight tracking-tight md:text-7xl">
            Your AI video tools, behind one account.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/62">
            Sign in to sync credits, upload reference media, launch video jobs, and review generation history through the existing ShadowEdge API.
          </p>
        </section>

        <Suspense fallback={<div className="rounded-[28px] border border-white/10 bg-white/[.045] p-8 text-white/62">Loading sign in...</div>}>
          <SignInForm />
        </Suspense>
      </div>
    </main>
  );
}

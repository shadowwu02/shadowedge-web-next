import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,180,77,.16),transparent_34%),#08090d] px-6 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-between rounded-[28px] border border-white/10 bg-white/[.035] p-8 shadow-2xl shadow-black/40">
        <nav className="flex items-center justify-between">
          <div className="text-xl font-black tracking-tight text-white">ShadowEdge</div>
          <Link
            className="rounded-full bg-[#ffb44d] px-5 py-2 text-sm font-black text-[#1f2027] transition hover:bg-[#ffc766]"
            href="/workspace/video"
          >
            Open Video Workspace
          </Link>
        </nav>
        <section className="max-w-3xl py-20">
          <p className="mb-4 text-sm font-bold uppercase tracking-[.24em] text-[#ffcf83]">
            Next.js workspace preview
          </p>
          <h1 className="text-5xl font-black leading-tight text-white md:text-7xl">
            Build videos from prompt, media, and model settings.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/62">
            This is the new ShadowEdge frontend foundation: Next.js App Router,
            React, TypeScript, and Tailwind, wired to the existing VPS API.
          </p>
        </section>
      </div>
    </main>
  );
}

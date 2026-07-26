"use client";

import Link from "next/link";
import { SHADOWEDGE_DEMO_PROJECT } from "@/features/dashboard/demoProject";
import { useI18n } from "@/i18n/useI18n";

export function DemoProjectWorkspace() {
  const { t, tf } = useI18n();
  const demo = SHADOWEDGE_DEMO_PROJECT;

  return (
    <div className="h-full overflow-y-auto rounded-[28px] border border-[#d9b56d]/15 bg-[#090909]">
      <div className="mx-auto max-w-6xl space-y-6 p-5 md:p-8">
        <header className="flex flex-col gap-5 rounded-[26px] border border-[#d9b56d]/20 bg-[radial-gradient(circle_at_top_right,rgba(217,181,109,.14),transparent_42%),#11100e] p-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[.18em] text-[#f2d899]">
              <span>{t("dashboard.demoWorkspace.eyebrow")}</span>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">{t("dashboard.demoWorkspace.readOnly")}</span>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-white/50">{t("dashboard.demoWorkspace.excluded")}</span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">{demo.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
              {t("dashboard.demoWorkspace.description")}
            </p>
          </div>
          <Link className="rounded-2xl border border-[#d9b56d]/25 bg-[#d9b56d]/10 px-5 py-3 text-center text-sm font-black text-[#f2d899] transition hover:bg-[#d9b56d]/16" href="/dashboard">
            {t("dashboard.demoWorkspace.back")}
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-4" aria-label={t("dashboard.demoWorkspace.canvasLabel")}>
          {demo.canvas.nodes.map((node, index) => (
            <article className="relative rounded-2xl border border-white/10 bg-white/[.035] p-4" key={node.id}>
              <span className="text-[10px] font-black tracking-[.18em] text-[#d9b56d]">{node.type}</span>
              <h2 className="mt-2 text-sm font-bold leading-5 text-white">{node.label}</h2>
              {index < demo.canvas.nodes.length - 1 ? <span aria-hidden="true" className="absolute -right-3 top-1/2 hidden text-[#d9b56d]/60 md:block">→</span> : null}
            </article>
          ))}
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <section className="rounded-[24px] border border-white/10 bg-white/[.025] p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#d9b56d]">{t("dashboard.demoWorkspace.storyboard")}</span>
                <h2 className="mt-2 text-xl font-black text-white">{t("dashboard.demoWorkspace.sequence")}</h2>
              </div>
              <span className="text-xs text-white/42">{tf("dashboard.demoWorkspace.seconds", { count: 12 })}</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {demo.storyboard.map((shot, index) => (
                <article className="rounded-2xl border border-white/8 bg-black/30 p-4" key={shot.id}>
                  <div className="aspect-video rounded-xl border border-[#d9b56d]/10 bg-[linear-gradient(145deg,#18140e,#080808)] p-3 text-[10px] font-black text-[#d9b56d]/80">{tf("dashboard.demoWorkspace.shot", { number: `0${index + 1}` })}</div>
                  <h3 className="mt-3 text-sm font-bold text-white">{shot.title}</h3>
                  <p className="mt-1 text-xs text-white/42">{shot.camera.replaceAll("_", " ")} · {shot.duration}s</p>
                </article>
              ))}
            </div>
            <div className="mt-5 flex h-16 overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-2">
              {demo.timeline.map((clip, index) => (
                <div className="flex items-center justify-center border-r border-black/60 bg-[#d9b56d]/15 px-3 text-[10px] font-black text-[#f2d899] last:border-r-0" key={clip.id} style={{ flex: clip.duration }}>
                  {tf("dashboard.demoWorkspace.clip", { number: index + 1, duration: clip.duration })}
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-[24px] border border-emerald-400/15 bg-emerald-400/[.045] p-5">
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">{t("dashboard.demoWorkspace.review")}</span>
              <div className="mt-3 flex items-end justify-between">
                <h2 className="text-xl font-black text-white">{demo.review.status}</h2>
                <strong className="text-3xl font-black text-emerald-300">{demo.review.qualityScore}</strong>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/50">{demo.review.summary}</p>
            </section>
            <section className="rounded-[24px] border border-[#d9b56d]/20 bg-[#d9b56d]/[.045] p-5">
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#d9b56d]">{t("dashboard.demoWorkspace.delivery")}</span>
              <h2 className="mt-3 text-xl font-black text-white">{tf("dashboard.demoWorkspace.package", { version: demo.delivery.version })}</h2>
              <p className="mt-2 text-sm text-white/50">{tf("dashboard.demoWorkspace.status", { status: demo.delivery.status })}</p>
              <p className="mt-4 rounded-xl border border-white/8 bg-black/25 p-3 text-xs leading-5 text-white/42">
                {t("dashboard.demoWorkspace.boundary")}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

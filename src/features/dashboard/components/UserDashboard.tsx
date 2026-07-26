"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  getDashboardOnboardingKey,
  shouldShowDashboardOnboarding,
} from "@/features/dashboard/dashboardOnboarding";
import type { StudioProjectExecutionSnapshot } from "@/features/studio/capabilities/studioProjectExecutionConcierge";
import type { StudioProjectSummary } from "@/features/studio/types/studioTypes";
import { getStudioProjectExecutionAssistant } from "@/lib/studio-project-execution-concierge-api";
import { createStudioProject, listStudioProjects } from "@/lib/studio-api";

function formatUpdatedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently updated";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function dashboardProjectHref(projectId: string) {
  return `/studio?module=canvas&project=${encodeURIComponent(projectId)}`;
}

function Onboarding({
  onComplete,
}: Readonly<{
  onComplete: () => void;
}>) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      eyebrow: "STEP 1 · CHOOSE YOUR START",
      title: "Create with Copilot",
      description: "Describe the creative outcome you want. Copilot prepares a reviewable project and Canvas draft—nothing is executed automatically.",
    },
    {
      eyebrow: "STEP 2 · UNDERSTAND THE CANVAS",
      title: "Plan · Design · Produce",
      description: "Creative Canvas connects goals, strategy, scenes, shots, agents, outputs, and delivery in one controlled workspace.",
    },
    {
      eyebrow: "STEP 3 · ENTER STUDIO",
      title: "Your creative workspace is ready",
      description: "Move into Studio to review drafts, explore Storyboard, and prepare production through existing approval gates.",
    },
  ] as const;
  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Welcome to ShadowEdge">
      <section className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-[#d9b56d]/25 bg-[radial-gradient(circle_at_top_right,rgba(217,181,109,.16),transparent_42%),#11100e] shadow-2xl shadow-black/60">
        <div className="border-b border-white/8 px-6 py-5 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-black uppercase tracking-[.2em] text-[#f2d899]">Welcome to ShadowEdge</span>
            <button className="text-xs font-bold text-white/40 transition hover:text-white/75" onClick={onComplete} type="button">Skip tour</button>
          </div>
          <div className="mt-5 flex gap-2" aria-label={`Onboarding step ${step + 1} of ${steps.length}`}>
            {steps.map((item, index) => (
              <span className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-[#d9b56d]" : "bg-white/10"}`} key={item.eyebrow} />
            ))}
          </div>
        </div>
        <div className="px-6 py-8 md:px-8 md:py-10">
          <span className="text-[10px] font-black tracking-[.18em] text-[#d9b56d]">{current.eyebrow}</span>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white">{current.title}</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/58">{current.description}</p>
          {step === 1 ? (
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["Plan", "Goal and strategy"],
                ["Design", "Scenes and shots"],
                ["Produce", "Review and delivery"],
              ].map(([title, detail]) => (
                <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4" key={title}>
                  <strong className="text-sm text-white">{title}</strong>
                  <p className="mt-1 text-xs text-white/42">{detail}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-white/8 px-6 py-5 md:px-8">
          <button className="rounded-xl px-4 py-2 text-sm font-bold text-white/50 disabled:opacity-25" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} type="button">Back</button>
          {step < steps.length - 1 ? (
            <button className="rounded-2xl bg-[#d9b56d] px-5 py-3 text-sm font-black text-[#11100e] transition hover:bg-[#f2d899]" onClick={() => setStep((value) => value + 1)} type="button">Continue</button>
          ) : (
            <Link className="rounded-2xl bg-[#d9b56d] px-5 py-3 text-sm font-black text-[#11100e] transition hover:bg-[#f2d899]" href="/studio?module=canvas&start=copilot" onClick={onComplete}>Enter Studio</Link>
          )}
        </footer>
      </section>
    </div>
  );
}

export function UserDashboard() {
  const router = useRouter();
  const { isLoading: authLoading, isSignedIn, profile } = useAuthSession();
  const [projects, setProjects] = useState<StudioProjectSummary[]>([]);
  const [snapshot, setSnapshot] = useState<StudioProjectExecutionSnapshot | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [creatingProject, setCreatingProject] = useState(false);
  const [error, setError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  const newestProject = projects[0] ?? null;
  const userIdentity = profile?.email || "verified-user";
  const onboardingKey = useMemo(() => getDashboardOnboardingKey(userIdentity), [userIdentity]);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    setError("");
    try {
      const nextProjects = (await listStudioProjects()).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      );
      setProjects(nextProjects);
      const completed = window.localStorage.getItem(onboardingKey) === "complete";
      setShowOnboarding(shouldShowDashboardOnboarding({ completed, projectCount: nextProjects.length }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Dashboard projects could not be loaded.");
    } finally {
      setLoadingProjects(false);
    }
  }, [onboardingKey]);

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => {
      if (isSignedIn) void loadProjects();
      else setLoadingProjects(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, isSignedIn, loadProjects]);

  useEffect(() => {
    if (!newestProject || !isSignedIn) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSnapshot(null);
      void getStudioProjectExecutionAssistant(newestProject.id, controller.signal)
        .then(setSnapshot)
        .catch(() => setSnapshot(null));
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isSignedIn, newestProject]);

  const completeOnboarding = useCallback(() => {
    window.localStorage.setItem(onboardingKey, "complete");
    setShowOnboarding(false);
  }, [onboardingKey]);

  const createProject = useCallback(async () => {
    setCreatingProject(true);
    setError("");
    try {
      const project = await createStudioProject("Untitled Creative Project");
      router.push(dashboardProjectHref(project.id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Project could not be created.");
    } finally {
      setCreatingProject(false);
    }
  }, [router]);

  if (authLoading || loadingProjects) {
    return <div className="grid h-full place-items-center rounded-[28px] border border-white/8 bg-[#0a0a0a] text-sm font-bold text-white/45">Loading your workspace…</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="grid h-full place-items-center rounded-[28px] border border-white/8 bg-[#0a0a0a] p-6 text-center">
        <div className="max-w-md">
          <span className="text-[11px] font-black uppercase tracking-[.18em] text-[#d9b56d]">Creative workspace</span>
          <h1 className="mt-4 text-3xl font-black text-white">Sign in to open your Dashboard</h1>
          <p className="mt-3 text-sm leading-6 text-white/50">Your verified session protects project ownership, recent work, and personalized onboarding.</p>
          <Link className="mt-6 inline-flex rounded-2xl bg-[#d9b56d] px-5 py-3 text-sm font-black text-[#11100e]" href="/sign-in?next=%2Fdashboard">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto rounded-[28px] border border-[#d9b56d]/15 bg-[#090909]">
      {showOnboarding ? <Onboarding onComplete={completeOnboarding} /> : null}
      <div className="mx-auto max-w-7xl space-y-6 p-5 md:p-8">
        <header className="rounded-[28px] border border-[#d9b56d]/20 bg-[radial-gradient(circle_at_top_right,rgba(217,181,109,.15),transparent_40%),#11100e] p-6 md:p-8">
          <span className="text-[11px] font-black uppercase tracking-[.2em] text-[#f2d899]">Your creative command center</span>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Welcome back{profile?.name ? `, ${profile.name}` : ""}.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Continue recent projects, start a controlled Copilot draft, or explore the complete production flow without leaving your workspace.</p>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-emerald-300">Verified session</span>
          </div>
        </header>

        <section aria-label="Dashboard quick actions" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link className="group rounded-2xl border border-[#d9b56d]/20 bg-[#d9b56d]/[.055] p-5 transition hover:-translate-y-0.5 hover:bg-[#d9b56d]/10" href="/studio?module=canvas&start=copilot">
            <span className="text-[10px] font-black uppercase tracking-[.17em] text-[#d9b56d]">Guided start</span>
            <strong className="mt-3 block text-base text-white">Start with Copilot</strong>
            <small className="mt-2 block leading-5 text-white/42">Create a reviewable project draft.</small>
          </Link>
          <button className="rounded-2xl border border-white/10 bg-white/[.035] p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/[.06] disabled:opacity-50" disabled={creatingProject} onClick={() => void createProject()} type="button">
            <span className="text-[10px] font-black uppercase tracking-[.17em] text-[#d9b56d]">New workspace</span>
            <strong className="mt-3 block text-base text-white">{creatingProject ? "Creating Project…" : "Create Project"}</strong>
            <small className="mt-2 block leading-5 text-white/42">Open a new owned cloud project.</small>
          </button>
          <Link className="rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:-translate-y-0.5 hover:bg-white/[.06]" href={newestProject ? dashboardProjectHref(newestProject.id) : "/studio?module=canvas"}>
            <span className="text-[10px] font-black uppercase tracking-[.17em] text-[#d9b56d]">Operating graph</span>
            <strong className="mt-3 block text-base text-white">Open Creative Canvas</strong>
            <small className="mt-2 block leading-5 text-white/42">Goals, scenes, agents, and outputs.</small>
          </Link>
          <Link className="rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:-translate-y-0.5 hover:bg-white/[.06]" href="/studio?module=canvas&panel=templates">
            <span className="text-[10px] font-black uppercase tracking-[.17em] text-[#d9b56d]">Reusable workflows</span>
            <strong className="mt-3 block text-base text-white">Browse Templates</strong>
            <small className="mt-2 block leading-5 text-white/42">Reuse confirmed creative pipelines.</small>
          </Link>
        </section>

        {error ? <div className="rounded-2xl border border-red-400/20 bg-red-400/[.06] p-4 text-sm text-red-200" role="alert">{error}</div> : null}

        {projects.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-[#d9b56d]/25 bg-[#d9b56d]/[.025] p-8 text-center md:p-12">
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-[#d9b56d]">New creative workspace</span>
            <h2 className="mt-4 text-2xl font-black text-white">Start your first creative project</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/48">Begin with a Copilot draft, use an existing workflow template, or explore a safe read-only demo before creating project data.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link className="rounded-2xl bg-[#d9b56d] px-5 py-3 text-sm font-black text-[#11100e]" href="/studio?module=canvas&start=copilot">Start with Copilot</Link>
              <Link className="rounded-2xl border border-white/12 bg-white/[.04] px-5 py-3 text-sm font-black text-white" href="/studio?module=canvas&panel=templates">Use Template</Link>
              <Link className="rounded-2xl border border-white/12 bg-white/[.04] px-5 py-3 text-sm font-black text-white" href="/dashboard/demo">Open Demo</Link>
            </div>
          </section>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
            <section className="rounded-[26px] border border-white/10 bg-white/[.025] p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#d9b56d]">Recent Projects</span>
                  <h2 className="mt-2 text-xl font-black text-white">Continue where you left off</h2>
                </div>
                <Link className="text-xs font-bold text-[#f2d899]" href="/studio?module=canvas">Open Studio →</Link>
              </div>
              <div className="mt-5 space-y-3">
                {projects.slice(0, 6).map((project, index) => (
                  <Link className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/25 p-4 transition hover:border-[#d9b56d]/25 hover:bg-[#d9b56d]/[.04]" href={dashboardProjectHref(project.id)} key={project.id}>
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#d9b56d]/15 bg-[#d9b56d]/[.07] text-sm font-black text-[#f2d899]">{String(index + 1).padStart(2, "0")}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-white">{project.name}</h3>
                      <p className="mt-1 text-xs text-white/40">{index === 0 && snapshot?.currentStage ? snapshot.currentStage : "Creative planning"} · {formatUpdatedAt(project.updatedAt)}</p>
                    </div>
                    <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[.055] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.13em] text-emerald-300">Active</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[26px] border border-[#d9b56d]/18 bg-[linear-gradient(160deg,rgba(217,181,109,.075),rgba(255,255,255,.02))] p-5 md:p-6" aria-label="Project overview">
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#d9b56d]">Project Overview</span>
              <h2 className="mt-3 truncate text-xl font-black text-white">{newestProject?.name}</h2>
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/45">Current progress</span>
                  <strong className="text-[#f2d899]">{snapshot?.progress ?? 0}%</strong>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-[#d9b56d]" style={{ width: `${Math.min(100, Math.max(0, snapshot?.progress ?? 0))}%` }} />
                </div>
              </div>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                  <dt className="text-[10px] uppercase tracking-[.14em] text-white/35">Current stage</dt>
                  <dd className="mt-2 text-sm font-bold text-white">{snapshot?.currentStage || "Creative planning"}</dd>
                </div>
                <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                  <dt className="text-[10px] uppercase tracking-[.14em] text-white/35">Recent activity</dt>
                  <dd className="mt-2 text-sm font-bold text-white">Updated {newestProject ? formatUpdatedAt(newestProject.updatedAt) : "recently"}</dd>
                </div>
              </dl>
              <div className="mt-4 rounded-2xl border border-violet-400/15 bg-violet-400/[.045] p-4">
                <span className="text-[9px] font-black uppercase tracking-[.16em] text-violet-300">Copilot insight · preview only</span>
                <p className="mt-2 text-sm leading-6 text-white/58">{snapshot?.nextActions[0]?.summary || "Open Project Copilot in Studio to review the next draft action and supporting evidence."}</p>
              </div>
              <Link className="mt-5 inline-flex w-full justify-center rounded-2xl border border-[#d9b56d]/25 bg-[#d9b56d]/10 px-4 py-3 text-sm font-black text-[#f2d899]" href={newestProject ? dashboardProjectHref(newestProject.id) : "/studio?module=canvas"}>Continue in Studio</Link>
            </section>
          </div>
        )}

        <section className="flex flex-col gap-4 rounded-[24px] border border-white/8 bg-white/[.02] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[.16em] text-[#d9b56d]">Explore safely</span>
            <h2 className="mt-2 text-lg font-black text-white">ShadowEdge Demo Campaign</h2>
            <p className="mt-1 text-xs text-white/42">Canvas, Storyboard, Timeline, Review, and Delivery examples. Read-only and excluded from business analytics.</p>
          </div>
          <Link className="shrink-0 rounded-2xl border border-white/12 bg-white/[.04] px-5 py-3 text-center text-sm font-black text-white" href="/dashboard/demo">Open Demo Project</Link>
        </section>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExternalClientReviewWorkspace } from "@/features/studio/capabilities/externalClientReview";
import {
  getExternalClientReview,
  submitExternalClientReviewAction,
} from "@/lib/external-client-review-api";

export function ExternalClientReviewPortal({ token }: Readonly<{ token: string }>) {
  const [workspace, setWorkspace] = useState<ExternalClientReviewWorkspace | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [revision, setRevision] = useState("");
  const [targetId, setTargetId] = useState("");
  const [timestamp, setTimestamp] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void getExternalClientReview(token, controller.signal)
      .then((value) => {
        setWorkspace(value);
        setTargetId(value.delivery.outputs[0]?.targetId || value.delivery.timeline[0]?.targetId || "");
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Review link is unavailable.");
      });
    return () => controller.abort();
  }, [token]);

  const can = (permission: string) => workspace?.review.permissions.includes(
    permission as "VIEW" | "COMMENT" | "APPROVE" | "REQUEST_REVISION",
  ) || false;
  const targets = useMemo(
    () => [...(workspace?.delivery.outputs || []), ...(workspace?.delivery.timeline || [])],
    [workspace],
  );

  async function submit(input: Parameters<typeof submitExternalClientReviewAction>[1]) {
    setBusy(true);
    setError("");
    try {
      const value = await submitExternalClientReviewAction(token, input);
      setWorkspace(value);
      setComment("");
      setRevision("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Review action could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !workspace) {
    return (
      <main className="min-h-screen bg-[#07090d] px-5 py-16 text-slate-100">
        <section className="mx-auto max-w-lg rounded-3xl border border-rose-400/20 bg-slate-950/80 p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-rose-300">Review unavailable</p>
          <h1 className="mt-3 text-2xl font-semibold">This secure review link cannot be opened.</h1>
          <p className="mt-3 text-sm text-slate-400">{error}</p>
        </section>
      </main>
    );
  }

  if (!workspace) {
    return <main className="min-h-screen bg-[#07090d] p-10 text-sm text-slate-400">Opening secure delivery review…</main>;
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-5">
        <header className="flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/80 p-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">ShadowEdge Client Review</p>
            <h1 className="mt-2 text-3xl font-semibold">Delivery {workspace.delivery.version}</h1>
            <p className="mt-2 text-sm text-slate-400">Review the approved delivery, leave time-based feedback, or submit your decision.</p>
          </div>
          <div className="rounded-2xl border border-white/10 px-4 py-3 text-right">
            <p className="text-xs text-slate-500">Review status</p>
            <strong className="text-sm text-cyan-200">{workspace.session.status}</strong>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,.75fr)]">
          <div className="grid gap-4">
            {workspace.delivery.outputs.map((output) => (
              <article key={output.targetId} className="overflow-hidden rounded-3xl border border-white/10 bg-black">
                {output.videoUrl ? (
                  <video className="aspect-video w-full bg-black" controls preload="metadata" src={output.videoUrl} />
                ) : (
                  <div className="grid aspect-video place-items-center text-sm text-slate-500">Video preview unavailable</div>
                )}
                <div className="flex items-center justify-between border-t border-white/10 px-5 py-3">
                  <span className="text-sm">{output.label}</span>
                  <span className="text-xs text-slate-500">{workspace.delivery.status}</span>
                </div>
              </article>
            ))}

            <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
              <h2 className="text-lg font-medium">Timeline feedback</h2>
              {can("COMMENT") ? (
                <div className="mt-4 grid gap-3">
                  <select className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm" value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                    {targets.map((target) => <option key={target.targetId} value={target.targetId}>{target.label}</option>)}
                  </select>
                  <input className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm" min={0} step={0.1} type="number" value={timestamp} onChange={(event) => setTimestamp(Number(event.target.value))} />
                  <textarea className="min-h-24 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm" placeholder="Add a clear review note…" value={comment} onChange={(event) => setComment(event.target.value)} />
                  <button className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40" disabled={busy || !comment.trim() || !targetId} onClick={() => void submit({ action: "COMMENT", targetId, timestamp, content: comment })} type="button">
                    Add comment
                  </button>
                </div>
              ) : <p className="mt-3 text-sm text-slate-500">This link is view-only.</p>}
            </section>
          </div>

          <aside className="grid content-start gap-4">
            <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
              <h2 className="text-lg font-medium">Comments</h2>
              <div className="mt-4 grid gap-3">
                {workspace.session.comments.length ? workspace.session.comments.map((item) => (
                  <article key={item.commentId} className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
                    <p className="text-sm text-slate-200">{item.content}</p>
                    <small className="mt-2 block text-xs text-slate-500">{item.timestamp.toFixed(1)}s · {new Date(item.createdAt).toLocaleString()}</small>
                  </article>
                )) : <p className="text-sm text-slate-500">No comments yet.</p>}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
              <h2 className="text-lg font-medium">Decision</h2>
              <p className="mt-2 text-sm text-slate-400">A decision records your review. It does not publish, regenerate, or execute anything.</p>
              <div className="mt-4 grid gap-3">
                {can("APPROVE") ? (
                  <button className="rounded-xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-40" disabled={busy} onClick={() => void submit({ action: "APPROVE" })} type="button">
                    Approve delivery
                  </button>
                ) : null}
                {can("REQUEST_REVISION") ? (
                  <>
                    <textarea className="min-h-24 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm" placeholder="Describe the requested revision…" value={revision} onChange={(event) => setRevision(event.target.value)} />
                    <button className="rounded-xl border border-amber-300/40 px-4 py-2 text-sm font-semibold text-amber-200 disabled:opacity-40" disabled={busy || !revision.trim()} onClick={() => void submit({ action: "REQUEST_REVISION", content: revision })} type="button">
                      Request revision
                    </button>
                  </>
                ) : null}
              </div>
              {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
            </section>

            <p className="px-2 text-xs leading-5 text-slate-600">
              Secure Delivery scope only. Studio projects, Canvas, Agents, Workflow, execution details, cost, and Credits are not available here.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}

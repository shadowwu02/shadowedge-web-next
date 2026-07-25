"use client";

import { useEffect, useState } from "react";
import type {
  StudioProjectActivityFeed,
  StudioProjectNotificationFeed,
} from "@/features/studio/capabilities/studioProjectActivity";
import {
  getStudioNotifications,
  getStudioProjectActivity,
  markStudioNotificationRead,
} from "@/lib/studio-project-activity-api";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

function time(value: string) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : value;
}

export function StudioCollaborationActivityCenter({ projectId }: { projectId: string | null }) {
  const [activity, setActivity] = useState<{ projectId: string; data: StudioProjectActivityFeed } | null>(null);
  const [notifications, setNotifications] = useState<StudioProjectNotificationFeed | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const loadNotifications = async (signal?: AbortSignal) => {
    setNotifications(await getStudioNotifications(signal));
  };

  useEffect(() => {
    const controller = new AbortController();
    const requests: Promise<unknown>[] = [
      getStudioNotifications(controller.signal).then(setNotifications),
    ];
    if (projectId) {
      requests.push(
        getStudioProjectActivity(projectId, controller.signal)
          .then((data) => setActivity({ projectId, data })),
      );
    }
    void Promise.all(requests).then(() => setError("")).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : "Collaboration Activity is unavailable.");
      }
    });
    return () => controller.abort();
  }, [projectId]);

  const currentActivity = activity?.projectId === projectId ? activity.data : null;

  const markRead = async (notificationId: string) => {
    if (busyId) return;
    setBusyId(notificationId);
    try {
      await markStudioNotificationRead(notificationId);
      await loadNotifications();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Notification could not be updated.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="studio-collaboration-center" aria-label="Collaboration Activity and Notifications">
      <header>
        <div><span>PROJECT AWARENESS</span><strong>Collaboration Center</strong></div>
        <b>{notifications?.unread ?? "—"} unread</b>
      </header>
      {error ? <p className="is-error">{error}</p> : null}
      <section>
        <header><strong>Notification Center</strong><span>Personal</span></header>
        {!notifications ? <p>Checking notifications…</p> : notifications.notifications.length ? (
          notifications.notifications.slice(0, 5).map((notification) => (
            <article className={notification.read ? "is-read" : "is-unread"} key={notification.notificationId}>
              <div><strong>{label(notification.type)}</strong><time>{time(notification.createdAt)}</time></div>
              <small>{notification.actionRequired ? "Action may be required" : "Project awareness"}</small>
              {!notification.read ? (
                <button disabled={busyId === notification.notificationId} onClick={() => void markRead(notification.notificationId)} type="button">
                  {busyId === notification.notificationId ? "Updating…" : "Mark read"}
                </button>
              ) : null}
            </article>
          ))
        ) : <p>No notifications.</p>}
      </section>
      <section>
        <header><strong>Activity Timeline</strong><span>{currentActivity?.activities.length ?? 0}</span></header>
        {!projectId ? <p>Open a project to view its activity.</p> : !currentActivity ? <p>Checking project activity…</p> : currentActivity.activities.length ? (
          currentActivity.activities.slice(0, 8).map((item) => (
            <article key={item.activityId}>
              <div><strong>{label(item.action)}</strong><time>{time(item.timestamp)}</time></div>
              <small>{item.actorId} · {label(item.resource.type)}</small>
            </article>
          ))
        ) : <p>No collaboration activity yet.</p>}
      </section>
      <footer>Awareness only. Notifications never authorize, execute, modify the project, trigger Workflow, or deduct Credits.</footer>
    </section>
  );
}

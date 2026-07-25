import type { StudioProjectMember } from "@/features/studio/capabilities/studioProjectCollaboration";

export const PROJECT_ACTIVITY_TYPES = [
  "CANVAS_UPDATED",
  "DRAFT_CREATED",
  "REVIEW_REQUESTED",
  "COMMENT_CREATED",
  "DELIVERY_CREATED",
  "COPILOT_INSIGHT_CREATED",
] as const;

export const PROJECT_NOTIFICATION_TYPES = [
  "REVIEW_REQUIRED",
  "COMMENT_RECEIVED",
  "APPROVAL_REQUIRED",
  "COPILOT_ALERT",
  "PROJECT_UPDATE",
] as const;

export type ProjectActivityType = typeof PROJECT_ACTIVITY_TYPES[number];
export type ProjectNotificationType = typeof PROJECT_NOTIFICATION_TYPES[number];

export type StudioProjectActivity = Readonly<{
  activityId: string;
  projectId: string;
  actorId: string;
  action: ProjectActivityType;
  resource: Readonly<{ type: string; id: string }>;
  timestamp: string;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type StudioProjectActivityFeed = Readonly<{
  projectId: string;
  activities: readonly StudioProjectActivity[];
  currentUser: StudioProjectMember;
}>;

export type StudioProjectNotification = Readonly<{
  notificationId: string;
  userId: string;
  projectId: string;
  type: ProjectNotificationType;
  read: boolean;
  createdAt: string;
  activityId: string;
  actionRequired: boolean;
}>;

export type StudioProjectNotificationFeed = Readonly<{
  userId: string;
  notifications: readonly StudioProjectNotification[];
  unread: number;
}>;

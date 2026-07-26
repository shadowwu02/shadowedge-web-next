"use client";

import { useEffect, useState } from "react";
import {
  studioShotTypeLabel,
  type StudioCreativeShot,
  type StudioCreativeStoryboard,
  type StudioShotBatchGenerationPlan,
  type StudioShotDraft,
  type StudioShotGenerationDraft,
} from "@/features/studio/capabilities/studioStoryboard";
import type { StudioProductionRunPlan } from "@/features/studio/capabilities/studioProductionRunPlan";
import type { StudioProductionExecutionApproval } from "@/features/studio/capabilities/studioProductionExecutionApproval";
import type { StudioProductionRuntimeProjection } from "@/features/studio/capabilities/studioProductionRuntime";
import type { StudioProductionReview } from "@/features/studio/capabilities/studioProductionReview";
import type {
  StudioProductionDeliveryCollection,
  StudioProductionDeliveryPackage,
} from "@/features/studio/capabilities/studioProductionDelivery";
import type {
  StudioClientReviewLinkResult,
  StudioClientReviewWorkspace,
} from "@/features/studio/capabilities/studioClientReview";
import type { StudioRevisionIntelligenceBundle } from "@/features/studio/capabilities/studioRevisionIntelligence";
import type { StudioRevisionRunPlan } from "@/features/studio/capabilities/studioRevisionRunPlan";
import type { StudioClientFeedbackIntelligence } from "@/features/studio/capabilities/studioClientFeedbackIntelligence";
import type { StudioClientRelationshipSnapshot } from "@/features/studio/capabilities/studioClientRelationshipIntelligence";
import { useStudioStore } from "@/features/studio/store/studioStore";
import { useI18n } from "@/i18n/useI18n";
import {
  confirmStudioShotDraft,
  confirmStudioShotBatchGenerationPlan,
  confirmStudioShotGenerationDraft,
  createStudioShotBatchGenerationPlan,
  createStudioShotGenerationDraft,
  getStudioSceneShots,
  getStudioShotBatchGenerationPlan,
  getStudioStoryboards,
  previewStudioShotDraft,
} from "@/lib/studio-storyboard-api";
import {
  confirmStudioProductionRunPlan,
  createStudioProductionRunPlan,
  getStudioProductionRunPlan,
} from "@/lib/studio-production-run-plan-api";
import {
  confirmStudioProductionExecutionApproval,
  createStudioProductionExecutionApproval,
} from "@/lib/studio-production-execution-approval-api";
import { getStudioProductionRunStatus } from "@/lib/studio-production-runtime-api";
import {
  approveStudioProductionReview,
  getStudioProductionReview,
} from "@/lib/studio-production-review-api";
import {
  createStudioProductionDeliveryPackage,
  getStudioProductionDeliveryPackages,
} from "@/lib/studio-production-delivery-api";
import {
  confirmStudioRevisionDraft,
  createStudioExternalReviewLink,
  createStudioReviewComment,
  createStudioRevisionDraft,
  getStudioClientReviewSession,
} from "@/lib/studio-client-review-api";
import {
  confirmStudioRevisionProposal,
  getStudioRevisionProposals,
} from "@/lib/studio-revision-intelligence-api";
import {
  confirmStudioRevisionRunPlan,
  createStudioRevisionRunPlan,
  getStudioRevisionRunPlan,
} from "@/lib/studio-revision-run-plan-api";
import {
  confirmStudioClientInsight,
  getStudioClientInsights,
} from "@/lib/studio-client-feedback-intelligence-api";
import {
  confirmStudioClientRelationshipRecommendation,
  getStudioClientRelationship,
} from "@/lib/studio-client-relationship-intelligence-api";

export function StudioStoryboardPanel({
  workspaceFocus = "storyboard",
}: Readonly<{
  workspaceFocus?: "storyboard" | "production" | "review" | "delivery";
}>) {
  const { t, tf } = useI18n();
  const projectId = useStudioStore((state) => state.projectId);
  const [bundle, setBundle] = useState<{ projectId: string; storyboards: readonly StudioCreativeStoryboard[]; error: string } | null>(null);
  const [selectedStoryboardId, setSelectedStoryboardId] = useState<string | null>(null);
  const [sceneShots, setSceneShots] = useState<{ sceneId: string; shots: readonly StudioCreativeShot[] } | null>(null);
  const [shotDraft, setShotDraft] = useState<StudioShotDraft | null>(null);
  const [generationDraft, setGenerationDraft] = useState<StudioShotGenerationDraft | null>(null);
  const [batchPlan, setBatchPlan] = useState<StudioShotBatchGenerationPlan | null>(null);
  const [productionPlan, setProductionPlan] = useState<StudioProductionRunPlan | null>(null);
  const [productionApproval, setProductionApproval] = useState<StudioProductionExecutionApproval | null>(null);
  const [productionRuntimeState, setProductionRuntimeState] = useState<{
    projectId: string;
    value: StudioProductionRuntimeProjection;
  } | null>(null);
  const [productionRuntimeError, setProductionRuntimeError] = useState("");
  const [productionReviewState, setProductionReviewState] = useState<{
    projectId: string;
    value: StudioProductionReview;
  } | null>(null);
  const [productionReviewError, setProductionReviewError] = useState("");
  const [productionDeliveryState, setProductionDeliveryState] = useState<{
    projectId: string;
    value: StudioProductionDeliveryCollection;
  } | null>(null);
  const [productionDeliveryError, setProductionDeliveryError] = useState("");
  const [clientReviewState, setClientReviewState] = useState<{
    projectId: string;
    value: StudioClientReviewWorkspace;
  } | null>(null);
  const [clientReviewError, setClientReviewError] = useState("");
  const [externalReviewLink, setExternalReviewLink] = useState<StudioClientReviewLinkResult | null>(null);
  const [clientInsightsState, setClientInsightsState] = useState<{
    projectId: string;
    value: StudioClientFeedbackIntelligence;
  } | null>(null);
  const [clientInsightsError, setClientInsightsError] = useState("");
  const [clientInsightsBusyId, setClientInsightsBusyId] = useState<string | null>(null);
  const [selectedClientRelationshipScope, setSelectedClientRelationshipScope] = useState("");
  const [clientRelationshipState, setClientRelationshipState] = useState<{
    clientScope: string;
    value: StudioClientRelationshipSnapshot;
  } | null>(null);
  const [clientRelationshipError, setClientRelationshipError] = useState("");
  const [clientRelationshipBusyId, setClientRelationshipBusyId] = useState<string | null>(null);
  const [revisionIntelligenceState, setRevisionIntelligenceState] = useState<{
    projectId: string;
    deliveryPackageId: string;
    value: StudioRevisionIntelligenceBundle;
  } | null>(null);
  const [revisionIntelligenceError, setRevisionIntelligenceError] = useState("");
  const [revisionRunPlanState, setRevisionRunPlanState] = useState<{
    projectId: string;
    deliveryPackageId: string;
    value: StudioRevisionRunPlan;
  } | null>(null);
  const [reviewCommentContent, setReviewCommentContent] = useState("");
  const [reviewCommentTimestamp, setReviewCommentTimestamp] = useState(0);
  const [reviewCommentTarget, setReviewCommentTarget] = useState("");
  const [selectedClientReviewPackageId, setSelectedClientReviewPackageId] = useState("");
  const [busyShotId, setBusyShotId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [productionBusy, setProductionBusy] = useState(false);
  const [productionApprovalBusy, setProductionApprovalBusy] = useState(false);
  const [productionReviewBusy, setProductionReviewBusy] = useState(false);
  const [productionDeliveryBusy, setProductionDeliveryBusy] = useState(false);
  const [clientReviewBusy, setClientReviewBusy] = useState(false);
  const [revisionIntelligenceBusyId, setRevisionIntelligenceBusyId] = useState<string | null>(null);
  const [revisionRunPlanBusy, setRevisionRunPlanBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void getStudioStoryboards(projectId, controller.signal).then((value) => {
      setBundle({ projectId, storyboards: value.storyboards, error: "" });
      setSelectedStoryboardId((current) =>
        value.storyboards.some((storyboard) => storyboard.storyboardId === current)
          ? current
          : value.storyboards[0]?.storyboardId || null,
      );
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        setBundle({ projectId, storyboards: [], error: reason instanceof Error ? reason.message : t("studio.storyboard.error.unavailable") });
      }
    });
    return () => controller.abort();
  }, [projectId, t]);

  const storyboards = bundle?.projectId === projectId ? bundle.storyboards : [];
  const selectedStoryboard = storyboards.find((storyboard) => storyboard.storyboardId === selectedStoryboardId) || storyboards[0] || null;
  const selectedSceneId = selectedStoryboard?.sceneId || null;

  useEffect(() => {
    if (!selectedSceneId) return;
    const controller = new AbortController();
    void getStudioSceneShots(selectedSceneId, controller.signal).then((value) => {
      setSceneShots({ sceneId: value.sceneId, shots: value.shots });
    }).catch(() => undefined);
    return () => controller.abort();
  }, [selectedSceneId]);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const value = await getStudioProductionRunStatus(projectId, controller.signal);
        if (!active) return;
        setProductionRuntimeState({ projectId, value });
        setProductionRuntimeError("");
      } catch (reason) {
        if (!active || controller.signal.aborted) return;
        setProductionRuntimeError(
          reason instanceof Error
            ? reason.message
        : t("studio.production.error.runtimeUnavailable"),
        );
      } finally {
        if (active) timer = setTimeout(() => void refresh(), 5000);
      }
    };
    void refresh();
    return () => {
      active = false;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [projectId, t]);

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void getStudioProductionRunPlan(projectId, controller.signal)
      .then((value) => setProductionPlan(value.plan))
      .catch(() => undefined);
    return () => controller.abort();
  }, [projectId]);

  useEffect(() => {
    if (!selectedSceneId) return;
    const controller = new AbortController();
    void getStudioShotBatchGenerationPlan(selectedSceneId, controller.signal)
      .then((value) => setBatchPlan(value.plan))
      .catch(() => undefined);
    return () => controller.abort();
  }, [selectedSceneId]);

  const shots = sceneShots && selectedSceneId && sceneShots.sceneId === selectedSceneId
    ? sceneShots.shots
    : selectedStoryboard?.shots || [];
  const activeProductionPlan = productionPlan?.projectId === projectId ? productionPlan : null;
  const activeProductionApproval = productionApproval?.projectId === projectId ? productionApproval : null;
  const activeProductionRuntime = productionRuntimeState?.projectId === projectId
    ? productionRuntimeState.value
    : null;
  const activeProductionReview = productionReviewState?.projectId === projectId
    ? productionReviewState.value
    : null;
  const activeProductionDelivery = productionDeliveryState?.projectId === projectId
    ? productionDeliveryState.value
    : null;
  const latestDeliveryPackage = activeProductionDelivery?.packages[0] || null;
  const selectedReviewPackageId = selectedClientReviewPackageId || latestDeliveryPackage?.packageId || "";
  const activeClientReview = clientReviewState?.projectId === projectId &&
    clientReviewState.value.deliveryPackage.packageId === selectedReviewPackageId
    ? clientReviewState.value
    : null;
  const activeRevisionIntelligence =
    revisionIntelligenceState?.projectId === projectId &&
    revisionIntelligenceState.deliveryPackageId === selectedReviewPackageId
      ? revisionIntelligenceState.value
      : null;
  const activeRevisionRunPlan =
    revisionRunPlanState?.projectId === projectId &&
    revisionRunPlanState.deliveryPackageId === selectedReviewPackageId
      ? revisionRunPlanState.value
      : null;
  const clientReviewTargetRefs = Array.from(new Set(
    (activeClientReview?.deliveryPackage.outputs || []).flatMap((output) => [
      output.timelineRef,
      output.outputRef,
      output.assetRef,
      output.shotId,
    ]).filter((value): value is string => Boolean(value)),
  ));
  const latestRevision = activeClientReview?.session.revisions[
    activeClientReview.session.revisions.length - 1
  ] || null;
  const activeClientReviewUpdatedAt = activeClientReview?.session.updatedAt || "";
  const revisionConfirmedCount = activeRevisionIntelligence?.summary.confirmedCount || 0;
  const activeClientInsights = clientInsightsState?.projectId === projectId
    ? clientInsightsState.value
    : null;
  const activeClientRelationshipScope = selectedClientRelationshipScope ||
    activeClientInsights?.patterns[0]?.clientScope ||
    "";
  const activeClientRelationship =
    clientRelationshipState?.clientScope === activeClientRelationshipScope
      ? clientRelationshipState.value
      : null;

  useEffect(() => {
    if (!projectId || activeProductionRuntime?.tracking.status !== "COMPLETED") return;
    const controller = new AbortController();
    void getStudioProductionReview(projectId, controller.signal)
      .then((value) => {
        setProductionReviewState({ projectId, value });
        setProductionReviewError("");
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setProductionReviewError(
          reason instanceof Error ? reason.message : t("studio.review.error.unavailable"),
          );
        }
      });
    return () => controller.abort();
  }, [activeProductionRuntime?.tracking.status, activeProductionRuntime?.tracking.trackingId, projectId, t]);

  useEffect(() => {
    if (!projectId || activeProductionReview?.status !== "APPROVED") return;
    const controller = new AbortController();
    void getStudioProductionDeliveryPackages(projectId, controller.signal)
      .then((value) => {
        setProductionDeliveryState({ projectId, value });
        setProductionDeliveryError("");
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setProductionDeliveryError(
          reason instanceof Error ? reason.message : t("studio.delivery.error.unavailable"),
          );
        }
      });
    return () => controller.abort();
  }, [activeProductionReview?.reviewId, activeProductionReview?.status, projectId, t]);

  useEffect(() => {
    if (!projectId || !selectedReviewPackageId) return;
    const controller = new AbortController();
    void getStudioClientReviewSession(projectId, selectedReviewPackageId, controller.signal)
      .then((value) => {
        setClientReviewState({ projectId, value });
        setClientReviewError("");
        setReviewCommentTarget(
          value.deliveryPackage.timelineReferences[0] ||
          value.deliveryPackage.outputs[0]?.outputRef ||
          value.deliveryPackage.packageId
        );
        setReviewCommentTimestamp(0);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setClientReviewError(
          reason instanceof Error ? reason.message : t("studio.clientReview.error.unavailable"),
          );
        }
      });
    return () => controller.abort();
  }, [projectId, selectedReviewPackageId, t]);

  useEffect(() => {
    if (!projectId || !selectedReviewPackageId || !activeClientReviewUpdatedAt) return;
    const controller = new AbortController();
    void getStudioRevisionProposals(projectId, selectedReviewPackageId, controller.signal)
      .then((value) => {
        setRevisionIntelligenceState({
          projectId,
          deliveryPackageId: selectedReviewPackageId,
          value,
        });
        setRevisionIntelligenceError("");
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setRevisionIntelligenceError(
          reason instanceof Error ? reason.message : t("studio.review.error.revisionUnavailable"),
          );
        }
      });
    return () => controller.abort();
  }, [activeClientReviewUpdatedAt, projectId, selectedReviewPackageId, t]);

  useEffect(() => {
    if (!projectId || !activeClientReviewUpdatedAt) return;
    const controller = new AbortController();
    void getStudioClientInsights(projectId, controller.signal)
      .then((value) => {
        setClientInsightsState({ projectId, value });
        setClientInsightsError("");
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setClientInsightsError(
          reason instanceof Error ? reason.message : t("studio.clientReview.error.insightsUnavailable"),
          );
        }
      });
    return () => controller.abort();
  }, [activeClientReviewUpdatedAt, projectId, t]);

  useEffect(() => {
    if (!activeClientRelationshipScope) return;
    const controller = new AbortController();
    void getStudioClientRelationship(activeClientRelationshipScope, controller.signal)
      .then((value) => {
        setClientRelationshipState({
          clientScope: activeClientRelationshipScope,
          value,
        });
        setClientRelationshipError("");
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setClientRelationshipError(
          reason instanceof Error ? reason.message : t("studio.clientReview.error.relationshipUnavailable"),
          );
        }
      });
    return () => controller.abort();
  }, [activeClientRelationshipScope, t]);

  useEffect(() => {
    if (!projectId || !selectedReviewPackageId || revisionConfirmedCount < 1) return;
    const controller = new AbortController();
    void getStudioRevisionRunPlan(projectId, selectedReviewPackageId, controller.signal)
      .then((value) => {
        setRevisionRunPlanState({
          projectId,
          deliveryPackageId: selectedReviewPackageId,
          value: value.plan,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setRevisionRunPlanState(null);
      });
    return () => controller.abort();
  }, [projectId, revisionConfirmedCount, selectedReviewPackageId]);

  const previewShotDraft = async (shot: StudioCreativeShot) => {
    setBusyShotId(shot.shotId);
    setMessage("");
    try {
      const result = await previewStudioShotDraft(shot.sceneId, shot.shotId);
      setShotDraft(result.draft);
      setMessage(t("studio.storyboard.message.shotPreviewReady"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.storyboard.error.shotPreview"));
    } finally {
      setBusyShotId(null);
    }
  };

  const confirmShotDraft = async () => {
    if (!shotDraft) return;
    setBusyShotId(shotDraft.shotId);
    setMessage("");
    try {
      const result = await confirmStudioShotDraft(shotDraft.sceneId, shotDraft.shotId, shotDraft.draftId);
      setShotDraft(result.draft);
      setMessage(t("studio.storyboard.message.shotCreated"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.storyboard.error.shotConfirm"));
    } finally {
      setBusyShotId(null);
    }
  };

  const createGenerationDraft = async (shot: StudioCreativeShot) => {
    setBusyShotId(shot.shotId);
    setMessage("");
    try {
      const result = await createStudioShotGenerationDraft(shot.shotId);
      setGenerationDraft(result.draft);
      setMessage(
        result.draft.status === "CONFIRMED"
          ? t("studio.storyboard.message.generationConfirmed")
          : t("studio.storyboard.message.generationPreview"),
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.storyboard.error.generationPreview"));
    } finally {
      setBusyShotId(null);
    }
  };

  const confirmGenerationDraft = async () => {
    if (!generationDraft) return;
    setBusyShotId(generationDraft.shotId);
    setMessage("");
    try {
      const result = await confirmStudioShotGenerationDraft(generationDraft.shotId, generationDraft.draftId);
      setGenerationDraft(result.draft);
      setMessage(t("studio.storyboard.message.generationCreated"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.storyboard.error.generationConfirm"));
    } finally {
      setBusyShotId(null);
    }
  };

  const createBatchPlan = async () => {
    if (!selectedSceneId) return;
    setBatchBusy(true);
    setMessage("");
    try {
      const result = await createStudioShotBatchGenerationPlan(selectedSceneId);
      setBatchPlan(result.plan);
      setMessage(
        result.plan.status === "BLOCKED"
          ? t("studio.storyboard.message.batchBlocked")
          : t("studio.storyboard.message.batchReady"),
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.storyboard.error.batchPreview"));
    } finally {
      setBatchBusy(false);
    }
  };

  const confirmBatchPlan = async () => {
    if (!selectedSceneId || !batchPlan) return;
    setBatchBusy(true);
    setMessage("");
    try {
      const result = await confirmStudioShotBatchGenerationPlan(selectedSceneId, batchPlan.batchPlanId);
      setBatchPlan(result.plan);
      setMessage(t("studio.storyboard.message.batchConfirmed"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.storyboard.error.batchConfirm"));
    } finally {
      setBatchBusy(false);
    }
  };

  const createProductionPlan = async () => {
    if (!projectId) return;
    setProductionBusy(true);
    setMessage("");
    try {
      const result = await createStudioProductionRunPlan(projectId);
      setProductionPlan(result.plan);
      setMessage(
        result.plan.status === "BLOCKED"
          ? t("studio.production.message.runBlocked")
          : t("studio.production.message.runReady"),
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.production.error.runPreview"));
    } finally {
      setProductionBusy(false);
    }
  };

  const confirmProductionPlan = async () => {
    if (!projectId || !activeProductionPlan) return;
    setProductionBusy(true);
    setMessage("");
    try {
      const result = await confirmStudioProductionRunPlan(projectId, activeProductionPlan.runId);
      setProductionPlan(result.plan);
      setMessage(t("studio.production.message.runConfirmed"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.production.error.runConfirm"));
    } finally {
      setProductionBusy(false);
    }
  };

  const createProductionApproval = async () => {
    if (!projectId || !activeProductionPlan || activeProductionPlan.status !== "CONFIRMED") return;
    setProductionApprovalBusy(true);
    setMessage("");
    try {
      const result = await createStudioProductionExecutionApproval(projectId, activeProductionPlan.runId);
      setProductionApproval(result);
      setMessage(
        result.status === "PENDING"
          ? t("studio.production.message.approvalReady")
          : t("studio.production.message.approvalBlocked"),
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.production.error.approvalCreate"));
    } finally {
      setProductionApprovalBusy(false);
    }
  };

  const confirmProductionApproval = async () => {
    if (!projectId || !activeProductionApproval || activeProductionApproval.status !== "PENDING") return;
    setProductionApprovalBusy(true);
    setMessage("");
    try {
      const result = await confirmStudioProductionExecutionApproval(
        projectId,
        activeProductionApproval.approvalId,
      );
      setProductionApproval(result);
      setMessage(
        t("studio.production.message.approvalConfirmed"),
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.production.error.approvalConfirm"));
    } finally {
      setProductionApprovalBusy(false);
    }
  };

  const approveProductionReview = async () => {
    if (!projectId || !activeProductionReview || activeProductionReview.status !== "IN_REVIEW") return;
    setProductionReviewBusy(true);
    setMessage("");
    try {
      const value = await approveStudioProductionReview(projectId, activeProductionReview.reviewId);
      setProductionReviewState({ projectId, value });
      setMessage(
        t("studio.review.message.approved"),
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.review.error.approve"));
    } finally {
      setProductionReviewBusy(false);
    }
  };

  const createDeliveryPackage = async (version: string) => {
    if (!projectId || activeProductionReview?.status !== "APPROVED") return;
    setProductionDeliveryBusy(true);
    setMessage("");
    try {
      const deliveryPackage = await createStudioProductionDeliveryPackage(projectId, version);
      const existing = activeProductionDelivery?.packages || [];
      const packages = [
        deliveryPackage,
        ...existing.filter((item) => item.packageId !== deliveryPackage.packageId),
      ] as readonly StudioProductionDeliveryPackage[];
      const [major, revision] = deliveryPackage.version
        .slice(1)
        .split(".")
        .map((value) => Number(value));
      setProductionDeliveryState({
        projectId,
        value: {
          projectId,
          productionId: deliveryPackage.productionId,
          reviewId: deliveryPackage.metadata.reviewId,
          packages,
          allowedVersions: [`v${major}.${revision + 1}`, `v${major + 1}.0`],
          approvalBoundary: {
            reviewApproved: true,
            automaticPublish: false,
            externalUpload: false,
            automaticShare: false,
            historyDeletion: false,
            creditsDeducted: false,
          },
        },
      });
      setSelectedClientReviewPackageId(deliveryPackage.packageId);
      setMessage(
        `${deliveryPackage.version} Delivery Package created as a reference-only Export Preview. Nothing was published, uploaded, shared, or charged.`,
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.delivery.error.create"));
    } finally {
      setProductionDeliveryBusy(false);
    }
  };

  const createExternalReviewLink = async () => {
    if (!projectId || !activeClientReview) return;
    setClientReviewBusy(true);
    setMessage("");
    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const result = await createStudioExternalReviewLink(projectId, {
        deliveryPackageId: activeClientReview.deliveryPackage.packageId,
        permissions: ["VIEW", "COMMENT", "APPROVE", "REQUEST_REVISION"],
        expiresAt,
      });
      setExternalReviewLink(result);
      setMessage(t("studio.clientReview.message.linkCreated"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.clientReview.error.linkCreate"));
    } finally {
      setClientReviewBusy(false);
    }
  };

  const addReviewComment = async () => {
    if (!projectId || !activeClientReview || !reviewCommentTarget || !reviewCommentContent.trim()) return;
    setClientReviewBusy(true);
    setMessage("");
    try {
      const result = await createStudioReviewComment(projectId, {
        deliveryPackageId: activeClientReview.deliveryPackage.packageId,
        targetRef: reviewCommentTarget,
        timestamp: reviewCommentTimestamp,
        content: reviewCommentContent,
      });
      setClientReviewState({
        projectId,
        value: { ...activeClientReview, session: result.session },
      });
      setReviewCommentContent("");
      setMessage(t("studio.clientReview.message.commentSaved"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.clientReview.error.commentSave"));
    } finally {
      setClientReviewBusy(false);
    }
  };

  const previewRevisionRequest = async () => {
    if (!projectId || !activeClientReview) return;
    setClientReviewBusy(true);
    setMessage("");
    try {
      const result = await createStudioRevisionDraft(
        projectId,
        activeClientReview.session.reviewSessionId,
        activeClientReview.deliveryPackage.packageId,
      );
      setClientReviewState({
        projectId,
        value: { ...activeClientReview, session: result.session },
      });
      setMessage(t("studio.review.message.revisionPreview"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.review.error.revisionPreview"));
    } finally {
      setClientReviewBusy(false);
    }
  };

  const confirmRevisionRequest = async () => {
    if (!projectId || !activeClientReview || !latestRevision || latestRevision.status !== "PREVIEW") return;
    setClientReviewBusy(true);
    setMessage("");
    try {
      const result = await confirmStudioRevisionDraft(
        projectId,
        activeClientReview.session.reviewSessionId,
        latestRevision.revisionId,
        activeClientReview.deliveryPackage.packageId,
      );
      setClientReviewState({
        projectId,
        value: { ...activeClientReview, session: result.session },
      });
      setMessage(t("studio.review.message.workflowDraftCreated"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.review.error.revisionConfirm"));
    } finally {
      setClientReviewBusy(false);
    }
  };

  const confirmRevisionSuggestion = async (proposalId: string) => {
    if (!projectId || !activeRevisionIntelligence) return;
    setRevisionIntelligenceBusyId(proposalId);
    setMessage("");
    try {
      const result = await confirmStudioRevisionProposal(
        projectId,
        proposalId,
        activeRevisionIntelligence.deliveryPackageId,
      );
      setRevisionIntelligenceState({
        projectId,
        deliveryPackageId: activeRevisionIntelligence.deliveryPackageId,
        value: {
          ...activeRevisionIntelligence,
          proposals: activeRevisionIntelligence.proposals.map((proposal) =>
            proposal.proposalId === result.proposal.proposalId
              ? result.proposal
              : proposal,
          ),
          summary: {
            ...activeRevisionIntelligence.summary,
            confirmedCount: activeRevisionIntelligence.proposals.filter((proposal) =>
              proposal.proposalId === result.proposal.proposalId
                ? result.proposal.status === "CONFIRMED"
                : proposal.status === "CONFIRMED"
            ).length,
          },
        },
      });
      setMessage(t("studio.review.message.aiRevisionConfirmed"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.review.error.aiRevisionConfirm"));
    } finally {
      setRevisionIntelligenceBusyId(null);
    }
  };

  const confirmClientInsight = async (patternId: string) => {
    if (!projectId || !activeClientInsights) return;
    setClientInsightsBusyId(patternId);
    setMessage("");
    try {
      const result = await confirmStudioClientInsight(projectId, patternId);
      setClientInsightsState({
        projectId,
        value: {
          ...activeClientInsights,
          patterns: activeClientInsights.patterns.map((pattern) =>
            pattern.patternId === result.pattern.patternId
              ? { ...result.pattern, historicalFeedbackCount: pattern.historicalFeedbackCount }
              : pattern,
          ),
          summary: {
            ...activeClientInsights.summary,
            confirmedMemoryDraftCount: activeClientInsights.patterns.filter((pattern) =>
              pattern.patternId === result.pattern.patternId
                ? result.pattern.status === "CONFIRMED"
                : pattern.status === "CONFIRMED"
            ).length,
          },
        },
      });
      setMessage(t("studio.clientReview.message.insightConfirmed"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.clientReview.error.insightConfirm"));
    } finally {
      setClientInsightsBusyId(null);
    }
  };

  const confirmClientRelationshipRecommendation = async (recommendationId: string) => {
    if (!activeClientRelationshipScope || !activeClientRelationship) return;
    setClientRelationshipBusyId(recommendationId);
    setMessage("");
    try {
      const result = await confirmStudioClientRelationshipRecommendation(
        activeClientRelationshipScope,
        recommendationId,
      );
      setClientRelationshipState({
        clientScope: activeClientRelationshipScope,
        value: result.snapshot,
      });
      setMessage(t("studio.clientReview.message.relationshipConfirmed"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.clientReview.error.relationshipConfirm"));
    } finally {
      setClientRelationshipBusyId(null);
    }
  };

  const createRevisionPlan = async (proposalId: string) => {
    if (!projectId || !activeClientReview) return;
    setRevisionRunPlanBusy(true);
    setMessage("");
    try {
      const result = await createStudioRevisionRunPlan(projectId, {
        proposalId,
        deliveryPackageId: activeClientReview.deliveryPackage.packageId,
      });
      setRevisionRunPlanState({
        projectId,
        deliveryPackageId: activeClientReview.deliveryPackage.packageId,
        value: result.plan,
      });
      setMessage(t("studio.review.message.revisionPlanCreated"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.review.error.revisionPlanCreate"));
    } finally {
      setRevisionRunPlanBusy(false);
    }
  };

  const confirmRevisionPlan = async () => {
    if (!projectId || !activeRevisionRunPlan || !activeClientReview) return;
    setRevisionRunPlanBusy(true);
    setMessage("");
    try {
      const result = await confirmStudioRevisionRunPlan(
        projectId,
        activeRevisionRunPlan.revisionRunId,
        activeClientReview.deliveryPackage.packageId,
      );
      setRevisionRunPlanState({
        projectId,
        deliveryPackageId: activeClientReview.deliveryPackage.packageId,
        value: result.plan,
      });
      setMessage(t("studio.review.message.productionDraftCreated"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.review.error.revisionPlanConfirm"));
    } finally {
      setRevisionRunPlanBusy(false);
    }
  };

  return (
    <section
      className="studio-storyboard-workspace"
      data-workspace-focus={workspaceFocus}
      id={`${workspaceFocus}-workspace`}
      aria-label={
        workspaceFocus === "storyboard"
          ? t("studio.storyboard.title")
          : workspaceFocus === "production"
            ? t("studio.production.title")
            : workspaceFocus === "review"
              ? t("studio.review.title")
              : t("studio.delivery.title")
      }
    >
      <header>
        <div>
          <span>
            {workspaceFocus === "storyboard"
              ? t("studio.storyboard.eyebrow")
              : workspaceFocus === "production"
                ? t("studio.production.eyebrow")
                : workspaceFocus === "review"
                  ? t("studio.review.eyebrow")
                  : t("studio.delivery.eyebrow")}
          </span>
          <h2>
            {workspaceFocus === "storyboard"
              ? t("studio.storyboard.title")
              : workspaceFocus === "production"
                ? t("studio.production.title")
                : workspaceFocus === "review"
                  ? t("studio.review.title")
                  : t("studio.delivery.title")}
          </h2>
          <p>
            {workspaceFocus === "storyboard"
              ? t("studio.storyboard.flow")
              : workspaceFocus === "production"
                ? t("studio.production.flow")
                : workspaceFocus === "review"
                  ? t("studio.review.flow")
                  : t("studio.delivery.flow")}
          </p>
        </div>
        <small>{t("studio.storyboard.boundary")}</small>
      </header>

      {!projectId ? (
        <div className="studio-storyboard-empty">{t("studio.storyboard.empty.openProject")}</div>
      ) : bundle?.projectId !== projectId ? (
        <div className="studio-storyboard-empty">{t("studio.storyboard.loading")}</div>
      ) : bundle.error ? (
        <div className="studio-storyboard-error" role="status">{bundle.error}</div>
      ) : !storyboards.length ? (
        <div className="studio-storyboard-empty">{t("studio.storyboard.empty.addScene")}</div>
      ) : (
        <div className="studio-storyboard-layout">
          <nav aria-label={t("studio.storyboard.scenesLabel")}>
            {storyboards.map((storyboard) => (
              <button
                className={storyboard.storyboardId === selectedStoryboard?.storyboardId ? "is-active" : ""}
                key={storyboard.storyboardId}
                onClick={() => {
                  setSelectedStoryboardId(storyboard.storyboardId);
                  setShotDraft(null);
                  setGenerationDraft(null);
                  setBatchPlan(null);
                  setMessage("");
                }}
                type="button"
              >
                <strong>{storyboard.sceneName}</strong>
                <span>{tf("studio.storyboard.shotCount", { count: storyboard.shots.length })}</span>
                <small>{storyboard.agentSource}</small>
              </button>
            ))}
            <button
              className="studio-storyboard-batch-button"
              disabled={batchBusy}
              onClick={() => void createBatchPlan()}
              type="button"
            >
              <strong>{batchBusy ? t("studio.storyboard.planning") : t("studio.storyboard.batch.title")}</strong>
              <small>{t("studio.storyboard.batch.previewAll")}</small>
            </button>
            <button
              className="studio-storyboard-production-button"
              disabled={productionBusy}
              onClick={() => void createProductionPlan()}
              type="button"
            >
              <strong>{productionBusy ? t("studio.storyboard.planning") : t("studio.production.planner.title")}</strong>
              <small>{t("studio.production.planner.previewAll")}</small>
            </button>
          </nav>

          <div className="studio-storyboard-shot-list" aria-label={t("studio.storyboard.shotCardsLabel")}>
            {shots.map((shot, index) => (
              <article className="studio-storyboard-shot" key={shot.shotId}>
                <header>
                  <span>{tf("studio.storyboard.shotNumber", { number: String(index + 1).padStart(2, "0") })}</span>
                  <b>{studioShotTypeLabel(shot.shotType)}</b>
                </header>
                <h3>{shot.description}</h3>
                <dl>
                  <div><dt>{t("studio.storyboard.camera")}</dt><dd>{shot.camera}</dd></div>
                  <div><dt>{t("studio.storyboard.duration")}</dt><dd>{shot.duration}s</dd></div>
                  <div><dt>{t("studio.storyboard.timeline")}</dt><dd>{shot.timelinePlaceholder.status.replaceAll("_", " ")}</dd></div>
                </dl>
                <div className="studio-storyboard-references">
                  <strong>{t("studio.storyboard.references")}</strong>
                  <span>{shot.references.length ? shot.references.join(" · ") : t("studio.storyboard.noReference")}</span>
                </div>
                <p>{shot.promptDraft.text}</p>
                <div className="studio-storyboard-shot-actions">
                  <button disabled={Boolean(busyShotId)} onClick={() => void previewShotDraft(shot)} type="button">
                    {busyShotId === shot.shotId ? t("studio.storyboard.preparing") : t("studio.storyboard.shotDraft.preview")}
                  </button>
                  <button disabled={Boolean(busyShotId)} onClick={() => void createGenerationDraft(shot)} type="button">
                    {busyShotId === shot.shotId ? t("studio.storyboard.preparing") : t("studio.storyboard.generation.create")}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="studio-storyboard-draft" aria-label={t("studio.storyboard.draftPreviewLabel")}>
            <section className="studio-storyboard-draft-section studio-story-workspace-section">
              <span>{t("studio.storyboard.shotDraft.title")}</span>
              {shotDraft ? (
                <>
                  <strong>{shotDraft.status === "CONFIRMED" ? t("studio.storyboard.shotDraft.confirmed") : t("studio.storyboard.previewReady")}</strong>
                  <p>{shotDraft.reason}</p>
                  <dl>
                    <div><dt>{t("studio.storyboard.camera")}</dt><dd>{shotDraft.proposal.camera}</dd></div>
                    <div><dt>{t("studio.storyboard.duration")}</dt><dd>{shotDraft.proposal.duration}s</dd></div>
                    <div><dt>{t("studio.storyboard.impact")}</dt><dd>{t("studio.storyboard.placeholderOnly")}</dd></div>
                  </dl>
                  <blockquote>{shotDraft.proposal.prompt}</blockquote>
                  {shotDraft.status === "PREVIEWED" ? (
                    <button disabled={Boolean(busyShotId)} onClick={() => void confirmShotDraft()} type="button">{t("studio.storyboard.shotDraft.confirm")}</button>
                  ) : <small>{t("studio.storyboard.shotDraft.unchanged")}</small>}
                </>
              ) : (
                <p>{t("studio.storyboard.shotDraft.empty")}</p>
              )}
            </section>

            <section className="studio-storyboard-draft-section studio-story-workspace-section" aria-label={t("studio.storyboard.generation.title")}>
              <span>{t("studio.storyboard.generation.title")}</span>
              {generationDraft ? (
                <>
                  <strong>{generationDraft.modelSuggestion.displayName} · {generationDraft.confidence}</strong>
                  <p>{generationDraft.modelSuggestion.reason}</p>
                  <dl>
                    <div><dt>{t("studio.storyboard.scope")}</dt><dd>{generationDraft.parameters.duration}s · {generationDraft.parameters.resolution} · {generationDraft.parameters.ratio}</dd></div>
                    <div><dt>{t("studio.storyboard.cost")}</dt><dd>{generationDraft.estimatedCost.kind} · {generationDraft.estimatedCost.shadowCredits} {t("studio.storyboard.credits")}</dd></div>
                    <div><dt>{t("studio.storyboard.gate")}</dt><dd>{generationDraft.modelSuggestion.availability} · {generationDraft.modelSuggestion.costStatus}</dd></div>
                  </dl>
                  <blockquote>{generationDraft.prompt}</blockquote>
                  <div className="studio-storyboard-generation-references" aria-label={t("studio.storyboard.referenceBindings")}>
                    {generationDraft.references.map((reference) => (
                      <span key={reference.referenceId}>{reference.type} · {t("studio.storyboard.bound")}</span>
                    ))}
                  </div>
                  {generationDraft.status === "PREVIEWED" ? (
                    <button disabled={Boolean(busyShotId)} onClick={() => void confirmGenerationDraft()} type="button">
                      {t("studio.storyboard.generation.confirm")}
                    </button>
                  ) : (
                    <small>{t("studio.storyboard.generation.ready")}</small>
                  )}
                </>
              ) : (
                <p>{t("studio.storyboard.generation.empty")}</p>
              )}
            </section>

            <section className="studio-storyboard-draft-section studio-story-workspace-section" aria-label={t("studio.storyboard.batch.title")}>
              <span>{t("studio.storyboard.batch.title")}</span>
              {batchPlan ? (
                <>
                  <strong>{tf("studio.storyboard.batch.summary", { count: batchPlan.shots.length, status: batchPlan.status })}</strong>
                  <dl>
                    <div><dt>{t("studio.production.totalCredits")}</dt><dd>{batchPlan.estimatedCost.totalCreditsEstimate}</dd></div>
                    <div><dt>{t("studio.production.costConfidence")}</dt><dd>{batchPlan.estimatedCost.costConfidence}</dd></div>
                    <div><dt>{t("studio.production.unknownCost")}</dt><dd>{batchPlan.estimatedCost.unknownCost}</dd></div>
                    <div><dt>{t("studio.storyboard.models")}</dt><dd>{batchPlan.models.map((model) => model.displayName).join(", ") || t("studio.common.unavailable")}</dd></div>
                  </dl>
                  <div className="studio-storyboard-batch-items">
                    {batchPlan.shots.map((item) => (
                      <div className="studio-storyboard-batch-item" key={item.shotId}>
                        <strong>{item.shotId}</strong>
                        <span>{item.status}</span>
                        <small>
                          {item.model?.displayName || item.blocker || t("studio.storyboard.modelUnavailable")}
                          {" · "}
                          {item.estimatedCost.shadowCredits === null ? t("studio.production.unknownCost") : tf("studio.production.creditsValue", { count: item.estimatedCost.shadowCredits })}
                        </small>
                      </div>
                    ))}
                  </div>
                  <div className="studio-storyboard-batch-tags" aria-label={t("studio.storyboard.batch.dependencies")}>
                    {batchPlan.dependencies.map((dependency, index) => (
                      <span key={`${dependency.fromShotId}:${dependency.toShotId || "independent"}:${index}`}>
                        {dependency.type}
                      </span>
                    ))}
                    {batchPlan.riskFlags.map((risk) => <span key={risk}>⚠ {risk}</span>)}
                  </div>
                  {batchPlan.status === "PREVIEWED" ? (
                    <button disabled={batchBusy} onClick={() => void confirmBatchPlan()} type="button">
                      {t("studio.storyboard.batch.confirm")}
                    </button>
                  ) : batchPlan.status === "CONFIRMED" ? (
                    <small>{t("studio.storyboard.batch.confirmed")}</small>
                  ) : (
                    <small>{t("studio.storyboard.batch.blocked")}</small>
                  )}
                </>
              ) : (
                <p>{t("studio.storyboard.batch.empty")}</p>
              )}
            </section>
            <section className="studio-storyboard-draft-section studio-production-run" aria-label={t("studio.production.planner.title")}>
              <span>{t("studio.production.planner.title")}</span>
              {activeProductionPlan ? (
                <>
                  <strong>{tf("studio.production.planner.summary", { scenes: activeProductionPlan.summary.sceneCount, shots: activeProductionPlan.summary.shotCount, status: activeProductionPlan.status })}</strong>
                  <dl>
                    <div><dt>{t("studio.production.agents")}</dt><dd>{activeProductionPlan.summary.agentCount}</dd></div>
                    <div><dt>{t("studio.production.checkpoints")}</dt><dd>{activeProductionPlan.summary.checkpointCount}</dd></div>
                    <div><dt>{t("studio.storyboard.credits")}</dt><dd>{activeProductionPlan.estimatedCost.totalCreditsEstimate}</dd></div>
                    <div><dt>{t("studio.production.costConfidence")}</dt><dd>{activeProductionPlan.estimatedCost.costConfidence}</dd></div>
                    <div><dt>{t("studio.production.unknownCost")}</dt><dd>{activeProductionPlan.estimatedCost.unknownCost}</dd></div>
                  </dl>
                  <div className="studio-production-run-scenes" aria-label={t("studio.production.sceneSequence")}>
                    {activeProductionPlan.scenes.map((scene) => (
                      <div key={scene.sceneId}>
                        <strong>{String(scene.order).padStart(2, "0")} · {scene.name}</strong>
                        <span>{tf("studio.production.sceneShots", { count: scene.shotCount, status: scene.status })}</span>
                      </div>
                    ))}
                  </div>
                  <div className="studio-production-run-steps" aria-label={t("studio.production.steps")}>
                    {activeProductionPlan.shots.map((step) => (
                      <div key={step.stepId}>
                        <strong>{step.agent.replaceAll("_", " ")}</strong>
                        <span>{step.status}</span>
                        <small>
                          {step.sceneId} · {step.shotId} · {step.model?.displayName || t("studio.storyboard.modelUnavailable")}
                        </small>
                      </div>
                    ))}
                  </div>
                  <div className="studio-storyboard-batch-tags" aria-label={t("studio.production.dependenciesRisks")}>
                    {Array.from(new Set(activeProductionPlan.dependencies.map((dependency) => dependency.type))).map((type) => (
                      <span key={type}>{type}</span>
                    ))}
                    {activeProductionPlan.riskFlags.map((risk) => <span key={risk}>⚠ {risk}</span>)}
                  </div>
                  {activeProductionPlan.status === "PREVIEWED" ? (
                    <button disabled={productionBusy} onClick={() => void confirmProductionPlan()} type="button">
                      {t("studio.production.planner.confirm")}
                    </button>
                  ) : activeProductionPlan.status === "CONFIRMED" ? (
                    <small>{t("studio.production.planner.confirmed")}</small>
                  ) : (
                    <small>{t("studio.production.planner.blocked")}</small>
                  )}
                </>
              ) : (
                <p>{t("studio.production.planner.empty")}</p>
              )}
            </section>
            <section className="studio-storyboard-draft-section studio-production-approval" aria-label={t("studio.production.approval.title")}>
              <span>{t("studio.production.approval.title")}</span>
              {activeProductionApproval ? (
                <>
                  <strong>{activeProductionApproval.status} · {activeProductionApproval.approvalId}</strong>
                  <dl>
                    <div><dt>{t("studio.production.scenes")}</dt><dd>{activeProductionApproval.executionSummary.sceneCount}</dd></div>
                    <div><dt>{t("studio.production.shots")}</dt><dd>{activeProductionApproval.executionSummary.shotCount}</dd></div>
                    <div><dt>{t("studio.production.agents")}</dt><dd>{activeProductionApproval.executionSummary.agentCount}</dd></div>
                    <div><dt>{t("studio.production.tasks")}</dt><dd>{activeProductionApproval.executionSummary.taskCount}</dd></div>
                    <div><dt>{t("studio.storyboard.credits")}</dt><dd>{activeProductionApproval.cost.estimatedCredits}</dd></div>
                    <div><dt>{t("studio.production.costConfidence")}</dt><dd>{activeProductionApproval.cost.confidence}</dd></div>
                    <div><dt>{t("studio.production.agentPolicy")}</dt><dd>{activeProductionApproval.policy.status}</dd></div>
                  </dl>
                  <div className="studio-production-approval-gates" aria-label={t("studio.production.approval.gates")}>
                    {([
                      [t("studio.production.gate.capability"), activeProductionApproval.gates.capability],
                      [t("studio.production.gate.availability"), activeProductionApproval.gates.availability],
                      [t("studio.production.gate.readiness"), activeProductionApproval.gates.readiness],
                      [t("studio.production.gate.verifiedScope"), activeProductionApproval.gates.verifiedScope],
                      [t("studio.storyboard.cost"), activeProductionApproval.gates.cost],
                      [t("studio.production.agentPolicy"), activeProductionApproval.gates.agentPolicy],
                    ] as const).map(([label, gate]) => (
                      <div className={gate.passed ? "is-passed" : "is-blocked"} key={label}>
                        <strong>{label}</strong>
                        <span>{gate.passed ? t("studio.production.gate.pass") : t("studio.production.gate.blocked")}</span>
                        {gate.blockers.length ? <small>{gate.blockers.join(", ")}</small> : null}
                      </div>
                    ))}
                  </div>
                  <div className="studio-storyboard-batch-tags" aria-label={t("studio.production.approval.risks")}>
                    {activeProductionApproval.riskFlags.length
                      ? activeProductionApproval.riskFlags.map((risk) => <span key={risk}>⚠ {risk}</span>)
                      : <span>{t("studio.production.noRisks")}</span>}
                  </div>
                  {activeProductionApproval.status === "PENDING" ? (
                    <button
                      disabled={productionApprovalBusy}
                      onClick={() => void confirmProductionApproval()}
                      type="button"
                    >
                      {productionApprovalBusy ? t("studio.common.confirming") : t("studio.production.approval.confirm")}
                    </button>
                  ) : activeProductionApproval.status === "APPROVED" ? (
                    <small>{t("studio.production.approval.confirmed")}</small>
                  ) : (
                    <small>{t("studio.production.approval.blocked")}</small>
                  )}
                </>
              ) : activeProductionPlan?.status === "CONFIRMED" ? (
                <>
                  <p>{t("studio.production.approval.revalidate")}</p>
                  <button
                    disabled={productionApprovalBusy}
                    onClick={() => void createProductionApproval()}
                    type="button"
                  >
                    {productionApprovalBusy ? t("studio.storyboard.preparing") : t("studio.production.approval.prepare")}
                  </button>
                </>
              ) : (
                <p>{t("studio.production.approval.empty")}</p>
              )}
            </section>
            <section className="studio-storyboard-draft-section studio-production-monitor" aria-label={t("studio.production.monitor.title")}>
              <span>{t("studio.production.monitor.title")}</span>
              {activeProductionRuntime ? (
                <>
                  <strong>
                    {activeProductionRuntime.tracking.status}
                    {" · "}
                    {tf("studio.production.monitor.progress", { progress: activeProductionRuntime.tracking.progress })}
                  </strong>
                  <dl>
                    <div><dt>{t("studio.production.monitor.wave")}</dt><dd>{activeProductionRuntime.tracking.currentWave} / {activeProductionRuntime.tracking.totalWaves}</dd></div>
                    <div><dt>{t("studio.production.shots")}</dt><dd>{activeProductionRuntime.tracking.steps.length}</dd></div>
                    <div><dt>{t("studio.production.agents")}</dt><dd>{new Set(activeProductionRuntime.tracking.steps.map((step) => step.agent)).size}</dd></div>
                    <div><dt>{t("studio.production.monitor.results")}</dt><dd>{activeProductionRuntime.tracking.results.length}</dd></div>
                  </dl>
                  <div
                    aria-label={t("studio.production.monitor.progressLabel")}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={activeProductionRuntime.tracking.progress}
                    className="studio-production-monitor-progress"
                    role="progressbar"
                  >
                    <span style={{ width: `${activeProductionRuntime.tracking.progress}%` }} />
                  </div>
                  <div className="studio-production-monitor-steps" aria-label={t("studio.production.monitor.statusLabel")}>
                    {activeProductionRuntime.tracking.steps.map((step) => (
                      <article className={`is-${step.status.toLowerCase()}`} key={step.productionStepId}>
                        <header>
                          <strong>{step.shotId}</strong>
                          <span>{step.status}</span>
                        </header>
                        <small>
                          {tf("studio.production.monitor.waveNumber", { wave: step.wave })} · {step.agent.replaceAll("_", " ")} · {step.capability}
                        </small>
                        {step.result ? (
                          <dl>
                            <div><dt>{t("studio.production.monitor.timelineClip")}</dt><dd>{step.result.timelineClipId || t("studio.production.monitor.pendingBinding")}</dd></div>
                            <div><dt>{t("studio.production.monitor.asset")}</dt><dd>{step.result.assetId || t("studio.production.monitor.pendingBinding")}</dd></div>
                            <div><dt>{t("studio.production.monitor.output")}</dt><dd>{step.result.outputNodeId || t("studio.production.monitor.pendingBinding")}</dd></div>
                          </dl>
                        ) : null}
                      </article>
                    ))}
                  </div>
                  <small>
                    {tf("studio.production.monitor.updated", { time: activeProductionRuntime.tracking.updatedAt })}
                  </small>
                  <small>{t("studio.production.monitor.boundary")}</small>
                </>
              ) : productionRuntimeError ? (
                <>
                  <strong>{t("studio.production.monitor.notReady")}</strong>
                  <p>{productionRuntimeError}</p>
                  <small>{t("studio.production.monitor.notReadyHelp")}</small>
                </>
              ) : (
                <p>{t("studio.production.monitor.connecting")}</p>
              )}
            </section>
            <section className="studio-storyboard-draft-section studio-production-review" aria-label={t("studio.review.productionTitle")}>
              <span>{t("studio.review.productionTitle")}</span>
              {activeProductionReview ? (
                <>
                  <strong>{activeProductionReview.status} · {activeProductionReview.reviewId}</strong>
                  <div className="studio-production-review-gates" aria-label={t("studio.review.qualityGate")}>
                    {activeProductionReview.qualityChecks.map((check) => (
                      <div className={`is-${check.status.toLowerCase()}`} key={check.type}>
                        <strong>{check.type.replaceAll("_", " ")}</strong>
                        <span>{check.status}</span>
                        <small>{check.score === null ? t("studio.review.humanReview") : `${check.score} / 100`}</small>
                      </div>
                    ))}
                  </div>
                  <div className="studio-production-review-suggestion">
                    <strong>{activeProductionReview.reviewSuggestion.actionType}</strong>
                    <span>{activeProductionReview.reviewSuggestion.status}</span>
                    <p>{activeProductionReview.reviewSuggestion.summary}</p>
                    <small>{t("studio.review.suggestionFlow")}</small>
                  </div>
                  <div className="studio-production-review-grid" aria-label={t("studio.review.shotGrid")}>
                    {activeProductionReview.results.map((result) => (
                      <article key={result.shotId}>
                        <header>
                          <strong>{result.shotId}</strong>
                          <span>{result.decision}</span>
                        </header>
                        {result.resultRef.videoUrl ? (
                          <video controls preload="metadata" src={result.resultRef.videoUrl} />
                        ) : (
                          <div className="studio-production-review-result-empty">{t("studio.review.resultUnavailable")}</div>
                        )}
                        <dl>
                          <div><dt>{t("studio.review.quality")}</dt><dd>{result.quality.score ?? t("studio.review.review")}</dd></div>
                          <div><dt>{t("studio.common.confidence")}</dt><dd>{result.quality.confidence}</dd></div>
                          <div><dt>{t("studio.storyboard.timeline")}</dt><dd>{result.resultRef.timelineRef || t("studio.review.unbound")}</dd></div>
                          <div><dt>{t("studio.production.monitor.output")}</dt><dd>{result.resultRef.outputRef || t("studio.review.unbound")}</dd></div>
                          <div><dt>{t("studio.production.monitor.asset")}</dt><dd>{result.resultRef.assetRef || t("studio.review.unbound")}</dd></div>
                        </dl>
                        <div className="studio-production-review-issues">
                          {result.issues.length
                            ? result.issues.map((issue) => (
                                <p key={issue.issueId}>⚠ {issue.type.replaceAll("_", " ")} · {issue.message}</p>
                              ))
                            : <p>{t("studio.review.noIssues")}</p>}
                        </div>
                      </article>
                    ))}
                  </div>
                  {activeProductionReview.status === "IN_REVIEW" ? (
                    <button
                      disabled={productionReviewBusy || !activeProductionReview.approvalReady}
                      onClick={() => void approveProductionReview()}
                      type="button"
                    >
                      {productionReviewBusy ? t("studio.review.approving") : t("studio.review.confirm")}
                    </button>
                  ) : (
                    <small>
                      {tf("studio.review.recordedAt", { time: activeProductionReview.approvedAt || activeProductionReview.createdAt })}
                    </small>
                  )}
                  {!activeProductionReview.approvalReady ? (
                    <small>{t("studio.review.approvalBlocked")}</small>
                  ) : null}
                  <small>{t("studio.review.boundary")}</small>
                </>
              ) : activeProductionRuntime?.tracking.status === "COMPLETED" ? (
                productionReviewError ? (
                  <>
                    <strong>{t("studio.review.unavailable")}</strong>
                    <p>{productionReviewError}</p>
                  </>
                ) : (
                  <p>{t("studio.review.building")}</p>
                )
              ) : (
                <p>{t("studio.review.empty")}</p>
              )}
            </section>
            <section className="studio-storyboard-draft-section studio-production-delivery" aria-label={t("studio.delivery.title")}>
              <span>{t("studio.delivery.title")}</span>
              {activeProductionReview?.status !== "APPROVED" ? (
                <p>{t("studio.delivery.requiresApproval")}</p>
              ) : activeProductionDelivery ? (
                <>
                  <header>
                    <div>
                      <strong>{latestDeliveryPackage?.version || t("studio.delivery.noVersion")}</strong>
                      <small>{latestDeliveryPackage?.status || t("studio.delivery.readyFirst")}</small>
                    </div>
                    <small>{tf("studio.delivery.versionCount", { count: activeProductionDelivery.packages.length })}</small>
                  </header>
                  {latestDeliveryPackage ? (
                    <>
                      <div className="studio-production-delivery-summary" aria-label={t("studio.delivery.packageSummary")}>
                        <div><strong>{latestDeliveryPackage.outputs.length}</strong><span>{t("studio.delivery.approvedOutputs")}</span></div>
                        <div><strong>{latestDeliveryPackage.assets.length}</strong><span>{t("studio.delivery.assets")}</span></div>
                        <div><strong>{latestDeliveryPackage.timelineReferences.length}</strong><span>{t("studio.delivery.timelineRefs")}</span></div>
                        <div><strong>{latestDeliveryPackage.qualitySummary.checks.length}</strong><span>{t("studio.delivery.qualityChecks")}</span></div>
                      </div>
                      <div className="studio-production-delivery-export">
                        <strong>{tf("studio.delivery.exportPreview", { format: latestDeliveryPackage.exportPreview.format.replaceAll("_", " ") })}</strong>
                        <small>{t("studio.delivery.exportBoundary")}</small>
                        <div>
                          {latestDeliveryPackage.outputs.map((output) => (
                            <article key={`${latestDeliveryPackage.packageId}:${output.shotId}`}>
                              <span>{output.shotId}</span>
                              <strong>{tf("studio.delivery.qualityValue", { score: output.quality.score ?? t("studio.review.review") })}</strong>
                              <small>
                                {output.outputRef || t("studio.delivery.outputUnbound")} · {output.assetRef || t("studio.delivery.assetUnbound")}
                              </small>
                            </article>
                          ))}
                        </div>
                      </div>
                      <div className="studio-production-delivery-quality" aria-label={t("studio.delivery.qualitySummary")}>
                        {latestDeliveryPackage.qualitySummary.checks.map((check) => (
                          <span key={check.type}>{check.type.replaceAll("_", " ")} · {check.status}</span>
                        ))}
                      </div>
                      <div className="studio-production-delivery-history" aria-label={t("studio.delivery.versionHistory")}>
                        {activeProductionDelivery.packages.map((deliveryPackage) => (
                          <div key={deliveryPackage.packageId}>
                            <strong>{deliveryPackage.version}</strong>
                            <span>{deliveryPackage.status}</span>
                            <small>{tf("studio.delivery.outputCount", { count: deliveryPackage.outputs.length })} · {deliveryPackage.createdAt}</small>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p>{t("studio.delivery.empty")}</p>
                  )}
                  <div className="studio-production-delivery-actions">
                    {activeProductionDelivery.allowedVersions.map((version, index) => (
                      <button
                        disabled={productionDeliveryBusy}
                        key={version}
                        onClick={() => void createDeliveryPackage(version)}
                        type="button"
                      >
                        {productionDeliveryBusy
                          ? t("studio.delivery.creating")
                          : activeProductionDelivery.packages.length
                            ? index === 0
                              ? tf("studio.delivery.createRevision", { version })
                              : tf("studio.delivery.createMajor", { version })
                            : tf("studio.delivery.createPackage", { version })}
                      </button>
                    ))}
                  </div>
                  <small>{t("studio.delivery.boundary")}</small>
                </>
              ) : productionDeliveryError ? (
                <>
                  <strong>{t("studio.delivery.unavailable")}</strong>
                  <p>{productionDeliveryError}</p>
                </>
              ) : (
                <p>{t("studio.delivery.loading")}</p>
              )}
            </section>
            <section className="studio-storyboard-draft-section studio-client-review" aria-label={t("studio.clientReview.title")}>
              <span>{t("studio.clientReview.title")}</span>
              {!latestDeliveryPackage ? (
                <p>{t("studio.clientReview.requiresDelivery")}</p>
              ) : activeClientReview ? (
                <>
                  <header>
                    <div>
                      <strong>{activeClientReview.deliveryPackage.version}</strong>
                      <small>{activeClientReview.session.status}</small>
                    </div>
                    <small>{tf("studio.clientReview.summary", { comments: activeClientReview.session.comments.length, revisions: activeClientReview.session.revisions.length })}</small>
                  </header>
                  <label className="studio-client-review-version">
                    <span>{t("studio.clientReview.deliveryVersion")}</span>
                    <select
                      onChange={(event) => setSelectedClientReviewPackageId(event.target.value)}
                      value={activeClientReview.deliveryPackage.packageId}
                    >
                      {activeProductionDelivery?.packages.map((deliveryPackage) => (
                        <option key={deliveryPackage.packageId} value={deliveryPackage.packageId}>
                          {deliveryPackage.version} · {deliveryPackage.status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="studio-client-review-link">
                    <header>
                      <strong>{t("studio.clientReview.externalPortal")}</strong>
                      <span>{t("studio.clientReview.deliveryScopeOnly")}</span>
                    </header>
                    {externalReviewLink?.link.deliveryPackageId === activeClientReview.deliveryPackage.packageId ? (
                      <>
                        <input
                          aria-label={t("studio.clientReview.externalLinkLabel")}
                          readOnly
                          value={`${typeof window === "undefined" ? "" : window.location.origin}${externalReviewLink.reviewPath}`}
                        />
                        <button
                          onClick={() => void navigator.clipboard.writeText(`${window.location.origin}${externalReviewLink.reviewPath}`)}
                          type="button"
                        >
                          {t("studio.clientReview.copyLink")}
                        </button>
                        <small>
                          {tf("studio.clientReview.expires", { time: new Date(externalReviewLink.link.expiresAt).toLocaleString() })}
                        </small>
                      </>
                    ) : (
                      <button
                        disabled={clientReviewBusy}
                        onClick={() => void createExternalReviewLink()}
                        type="button"
                      >
                        {clientReviewBusy ? t("studio.delivery.creating") : t("studio.clientReview.createLink")}
                      </button>
                    )}
                    <small>{t("studio.clientReview.linkBoundary")}</small>
                  </div>
                  <div className="studio-client-review-video">
                    {activeClientReview.deliveryPackage.outputs[0]?.videoUrl ? (
                      <video
                        controls
                        preload="metadata"
                        src={activeClientReview.deliveryPackage.outputs[0].videoUrl}
                      />
                    ) : (
                      <div>{t("studio.clientReview.videoUnavailable")}</div>
                    )}
                    <small>{tf("studio.clientReview.videoCaption", { version: activeClientReview.deliveryPackage.version })}</small>
                  </div>
                  <div className="studio-client-review-comment-form" aria-label={t("studio.clientReview.timelineComment")}>
                    <label>
                      <span>{t("studio.clientReview.target")}</span>
                      <select
                        onChange={(event) => setReviewCommentTarget(event.target.value)}
                        value={reviewCommentTarget}
                      >
                        {clientReviewTargetRefs.map((targetRef) => (
                          <option key={targetRef} value={targetRef}>{targetRef}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{t("studio.clientReview.timestamp")}</span>
                      <input
                        min={0}
                        onChange={(event) => setReviewCommentTimestamp(Number(event.target.value))}
                        step={0.1}
                        type="number"
                        value={reviewCommentTimestamp}
                      />
                    </label>
                    <label>
                      <span>{t("studio.clientReview.feedback")}</span>
                      <textarea
                        maxLength={2000}
                        onChange={(event) => setReviewCommentContent(event.target.value)}
                        placeholder={t("studio.clientReview.feedbackPlaceholder")}
                        value={reviewCommentContent}
                      />
                    </label>
                    <button
                      disabled={clientReviewBusy || !reviewCommentContent.trim() || !reviewCommentTarget}
                      onClick={() => void addReviewComment()}
                      type="button"
                    >
                      {clientReviewBusy ? t("studio.clientReview.saving") : t("studio.clientReview.addComment")}
                    </button>
                  </div>
                  <div className="studio-client-review-comments" aria-label={t("studio.clientReview.reviewFeedback")}>
                    {activeClientReview.session.comments.length ? (
                      activeClientReview.session.comments.map((comment) => (
                        <article key={comment.commentId}>
                          <header>
                            <strong>{comment.targetRef}</strong>
                            <span>{comment.status}</span>
                          </header>
                          <p>{comment.content}</p>
                          <small>{comment.timestamp}s · {comment.createdAt}</small>
                        </article>
                      ))
                    ) : (
                      <p>{t("studio.clientReview.noFeedback")}</p>
                    )}
                  </div>
                  <div className="studio-revision-intelligence" aria-label={t("studio.clientReview.insights.title")}>
                    <header>
                      <div>
                        <strong>{t("studio.clientReview.insights.title")}</strong>
                        <small>{t("studio.clientReview.insights.flow")}</small>
                      </div>
                      <span>
                        {activeClientInsights
                          ? tf("studio.clientReview.insights.patternCount", { count: activeClientInsights.summary.patternCount })
                          : t("studio.clientReview.analyzing")}
                      </span>
                    </header>
                    {activeClientInsights?.patterns.length ? (
                      activeClientInsights.patterns.map((pattern) => (
                        <article key={pattern.patternId}>
                          <header>
                            <strong>{tf("studio.clientReview.clientScope", { scope: pattern.clientScope.slice(-6) })}</strong>
                            <span>{tf("studio.clientReview.confidenceValue", { confidence: pattern.confidence })}</span>
                          </header>
                          <small>{tf("studio.clientReview.insights.feedbackCount", { count: pattern.historicalFeedbackCount })}</small>
                          <ul>
                            {pattern.patterns.map((item) => (
                              <li key={`${pattern.patternId}:${item.type}`}>
                                <strong>{item.type.replaceAll("_", " ")}</strong>
                                {" · "}
                                {item.recommendation}
                                {" · "}
                                {tf("studio.clientReview.evidenceCount", { count: item.evidenceCount })}
                              </li>
                            ))}
                          </ul>
                          <details>
                            <summary>{t("studio.clientReview.evidenceUsed")}</summary>
                            <ul>
                              {pattern.evidence.map((evidence) => (
                                <li key={evidence.evidenceId}>
                                  {evidence.type.replaceAll("_", " ")} · {evidence.summary}
                                </li>
                              ))}
                            </ul>
                          </details>
                          {pattern.memoryDraft ? (
                            <small>
                              {tf("studio.clientReview.memoryDraft", { id: pattern.memoryDraft.draftId, status: pattern.memoryDraft.status })}
                            </small>
                          ) : (
                            <button
                              disabled={Boolean(clientInsightsBusyId)}
                              onClick={() => void confirmClientInsight(pattern.patternId)}
                              type="button"
                            >
                              {clientInsightsBusyId === pattern.patternId
                                ? t("studio.common.confirming")
                                : t("studio.clientReview.createMemoryDraft")}
                            </button>
                          )}
                          <button
                            aria-pressed={activeClientRelationshipScope === pattern.clientScope}
                            onClick={() => setSelectedClientRelationshipScope(pattern.clientScope)}
                            type="button"
                          >
                            {activeClientRelationshipScope === pattern.clientScope
                              ? t("studio.clientReview.relationshipSelected")
                              : t("studio.clientReview.viewRelationship")}
                          </button>
                        </article>
                      ))
                    ) : clientInsightsError ? (
                      <p>{clientInsightsError}</p>
                    ) : (
                      <p>{t("studio.clientReview.insights.empty")}</p>
                    )}
                    <small>
                      {t("studio.clientReview.insights.boundary")}
                    </small>
                  </div>
                  <div className="studio-revision-intelligence" aria-label={t("studio.clientReview.relationship.title")}>
                    <header>
                      <div>
                        <strong>{t("studio.clientReview.relationship.title")}</strong>
                        <small>{t("studio.clientReview.relationship.description")}</small>
                      </div>
                      <span>{activeClientRelationship?.confidence || t("studio.clientReview.analyzing")}</span>
                    </header>
                    {activeClientRelationship ? (
                      <>
                        <small>
                          {tf("studio.clientReview.clientScope", { scope: activeClientRelationship.clientScope.slice(-6) })}
                          {" · "}
                          {tf("studio.clientReview.relationship.projectCount", { count: activeClientRelationship.projects.length })}
                        </small>
                        <dl>
                          {Object.entries(activeClientRelationship.metrics).map(([name, metric]) => (
                            <div key={name}>
                              <dt>{name.replaceAll("_", " ")}</dt>
                              <dd>
                                {metric.value === null ? t("studio.common.unknown") : String(metric.value)}
                                {" "}
                                {metric.unit.replaceAll("_", " ")}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        <div className="studio-storyboard-batch-tags" aria-label={t("studio.clientReview.relationship.risks")}>
                          {activeClientRelationship.riskFlags.length
                            ? activeClientRelationship.riskFlags.map((risk) => (
                              <span key={risk}>⚠ {risk.replaceAll("_", " ")}</span>
                            ))
                            : <span>{t("studio.clientReview.relationship.noRisk")}</span>}
                        </div>
                        <section>
                          <strong>{t("studio.clientReview.relationship.history")}</strong>
                          <ul>
                            {activeClientRelationship.projects.map((project) => (
                              <li key={project.projectId}>
                                {tf("studio.clientReview.relationship.project", { id: project.projectId.slice(-8) })}
                                {" · "}
                                {tf("studio.clientReview.relationship.approvedDeliveries", { count: project.approvedDeliveries })}
                                {" · "}
                                {tf("studio.clientReview.relationship.confirmedRevisions", { count: project.confirmedRevisions })}
                              </li>
                            ))}
                          </ul>
                        </section>
                        <section>
                          <strong>{t("studio.clientReview.relationship.preferences")}</strong>
                          {activeClientRelationship.preferences.length ? (
                            <ul>
                              {activeClientRelationship.preferences.map((preference) => (
                                <li key={preference.type}>
                                  {preference.type.replaceAll("_", " ")}
                                  {" · "}
                                  {preference.confidence}
                                  {" · "}
                                  {tf("studio.clientReview.evidenceCount", { count: preference.evidenceCount })}
                                </li>
                              ))}
                            </ul>
                          ) : <p>{t("studio.clientReview.relationship.noPreference")}</p>}
                        </section>
                        <section>
                          <strong>{t("studio.clientReview.relationship.successPatterns")}</strong>
                          {activeClientRelationship.successPatterns.length ? (
                            <ul>
                              {activeClientRelationship.successPatterns.map((pattern) => (
                                <li key={`${pattern.type}:${pattern.evidenceRef}`}>
                                  {pattern.type.replaceAll("_", " ")} · {pattern.summary}
                                </li>
                              ))}
                            </ul>
                          ) : <p>{t("studio.clientReview.relationship.noSuccessPattern")}</p>}
                        </section>
                        <section>
                          <strong>{t("studio.clientReview.relationship.recommendations")}</strong>
                          {activeClientRelationship.recommendations.map((recommendation) => (
                            <article key={recommendation.recommendationId}>
                              <header>
                                <strong>{recommendation.type.replaceAll("_", " ")}</strong>
                                <span>{tf("studio.clientReview.confidenceValue", { confidence: recommendation.confidence })}</span>
                              </header>
                              <p>{recommendation.message}</p>
                              <small>{tf("studio.clientReview.relationship.qualifiedEvidence", { count: recommendation.evidenceRefs.length })}</small>
                              {recommendation.draft ? (
                                <small>
                                  {tf("studio.clientReview.relationship.draft", { id: recommendation.draft.draftId, status: recommendation.draft.status })}
                                </small>
                              ) : (
                                <button
                                  disabled={Boolean(clientRelationshipBusyId)}
                                  onClick={() => void confirmClientRelationshipRecommendation(
                                    recommendation.recommendationId,
                                  )}
                                  type="button"
                                >
                                  {clientRelationshipBusyId === recommendation.recommendationId
                                    ? t("studio.common.confirming")
                                    : t("studio.clientReview.relationship.createDraft")}
                                </button>
                              )}
                            </article>
                          ))}
                        </section>
                      </>
                    ) : clientRelationshipError ? (
                      <p>{clientRelationshipError}</p>
                    ) : (
                      <p>{t("studio.clientReview.relationship.empty")}</p>
                    )}
                    <small>
                      {t("studio.clientReview.relationship.boundary")}
                    </small>
                  </div>
                  <div className="studio-revision-intelligence" aria-label={t("studio.review.aiRevision.title")}>
                    <header>
                      <div>
                        <strong>{t("studio.review.aiRevision.title")}</strong>
                        <small>{t("studio.review.aiRevision.flow")}</small>
                      </div>
                      <span>
                        {activeRevisionIntelligence
                          ? tf("studio.review.aiRevision.proposalCount", { count: activeRevisionIntelligence.summary.proposalCount })
                          : t("studio.clientReview.analyzing")}
                      </span>
                    </header>
                    {activeRevisionIntelligence?.proposals.length ? (
                      activeRevisionIntelligence.proposals.map((proposal) => (
                        <article key={proposal.proposalId}>
                          <header>
                            <strong>{proposal.feedbackIntent.type.replaceAll("_", " ")}</strong>
                            <span>{tf("studio.clientReview.confidenceValue", { confidence: proposal.confidence })}</span>
                          </header>
                          <blockquote>{proposal.sourceComment.content}</blockquote>
                          <dl>
                            <div>
                              <dt>{t("studio.review.aiRevision.originalComment")}</dt>
                              <dd>{proposal.sourceComment.targetRef} · {proposal.sourceComment.timestamp}s</dd>
                            </div>
                            <div>
                              <dt>{t("studio.review.aiRevision.intent")}</dt>
                              <dd>{proposal.feedbackIntent.type.replaceAll("_", " ")}</dd>
                            </div>
                            <div>
                              <dt>{t("studio.review.aiRevision.scope")}</dt>
                              <dd>{proposal.affectedShots.join(", ") || proposal.feedbackIntent.affectedRefs.join(", ")}</dd>
                            </div>
                            <div>
                              <dt>{t("studio.review.aiRevision.boundaryLabel")}</dt>
                              <dd>{t("studio.review.aiRevision.draftOnly")}</dd>
                            </div>
                          </dl>
                          <ul>
                            {proposal.recommendedChanges.map((change) => (
                              <li key={`${proposal.proposalId}:${change.targetRef}`}>
                                {change.targetRef} · {change.description}
                              </li>
                            ))}
                          </ul>
                          {proposal.workflowDraftRef ? (
                            <>
                              <small>
                                {tf("studio.review.aiRevision.workflowDraft", { id: proposal.workflowDraftRef.draftId, status: proposal.workflowDraftRef.status })}
                              </small>
                              <button
                                disabled={revisionRunPlanBusy}
                                onClick={() => void createRevisionPlan(proposal.proposalId)}
                                type="button"
                              >
                                {revisionRunPlanBusy ? t("studio.storyboard.planning") : t("studio.review.aiRevision.planRun")}
                              </button>
                            </>
                          ) : (
                            <button
                              disabled={Boolean(revisionIntelligenceBusyId)}
                              onClick={() => void confirmRevisionSuggestion(proposal.proposalId)}
                              type="button"
                            >
                              {revisionIntelligenceBusyId === proposal.proposalId
                                ? t("studio.common.confirming")
                                : t("studio.review.aiRevision.confirm")}
                            </button>
                          )}
                        </article>
                      ))
                    ) : revisionIntelligenceError ? (
                      <p>{revisionIntelligenceError}</p>
                    ) : activeClientReview.session.comments.length ? (
                      <p>{t("studio.review.aiRevision.analyzing")}</p>
                    ) : (
                      <p>{t("studio.review.aiRevision.empty")}</p>
                    )}
                    <small>{t("studio.review.aiRevision.safety")}</small>
                  </div>
                  <div className="studio-revision-planner" aria-label={t("studio.review.revisionPlanner.title")}>
                    <header>
                      <div>
                        <strong>{t("studio.review.revisionPlanner.title")}</strong>
                        <small>{t("studio.review.revisionPlanner.flow")}</small>
                      </div>
                      <span>{activeRevisionRunPlan?.status || t("studio.review.revisionPlanner.notPlanned")}</span>
                    </header>
                    {activeRevisionRunPlan ? (
                      <>
                        <div className="studio-revision-version-loop" aria-label={t("studio.review.revisionPlanner.versionLoop")}>
                          <span>{tf("studio.clientReview.deliveryLabel", { version: activeRevisionRunPlan.versionPlan.sourceVersion })}</span>
                          <b>→</b>
                          <span>{t("studio.review.revisionPlanner.revision")}</span>
                          <b>→</b>
                          <span>{tf("studio.clientReview.deliveryLabel", { version: activeRevisionRunPlan.versionPlan.targetVersion })}</span>
                        </div>
                        <dl>
                          <div>
                            <dt>{t("studio.review.revisionPlanner.modifiedShots")}</dt>
                            <dd>{activeRevisionRunPlan.affectedShots.join(", ") || t("studio.common.none")}</dd>
                          </div>
                          <div>
                            <dt>{t("studio.review.revisionPlanner.preserved")}</dt>
                            <dd>{activeRevisionRunPlan.preservedShots.join(", ") || t("studio.common.none")}</dd>
                          </div>
                          <div>
                            <dt>{t("studio.review.revisionPlanner.timelineImpact")}</dt>
                            <dd>{activeRevisionRunPlan.impact.timelineImpact.status.replaceAll("_", " ")}</dd>
                          </div>
                          <div>
                            <dt>{t("studio.review.revisionPlanner.assetImpact")}</dt>
                            <dd>{activeRevisionRunPlan.impact.assetImpact.status.replaceAll("_", " ")}</dd>
                          </div>
                          <div>
                            <dt>{t("studio.review.revisionPlanner.cost")}</dt>
                            <dd>{tf("studio.production.creditsValue", { count: activeRevisionRunPlan.estimatedCost.totalCreditsEstimate })}</dd>
                          </div>
                          <div>
                            <dt>{t("studio.production.costConfidence")}</dt>
                            <dd>{activeRevisionRunPlan.estimatedCost.costConfidence}</dd>
                          </div>
                        </dl>
                        <div className="studio-revision-scope" aria-label={t("studio.review.revisionPlanner.scope")}>
                          {activeRevisionRunPlan.revisionScope.map((scope, index) => (
                            <span key={`${scope.type}:${scope.shotId || scope.draftShotRef}:${index}`}>
                              {scope.type.replaceAll("_", " ")} · {scope.shotId || scope.draftShotRef}
                            </span>
                          ))}
                        </div>
                        <div className="studio-storyboard-batch-tags" aria-label={t("studio.review.revisionPlanner.risks")}>
                          {activeRevisionRunPlan.riskFlags.map((risk) => <span key={risk}>⚠ {risk}</span>)}
                        </div>
                        {activeRevisionRunPlan.productionWorkflowDraftRef ? (
                          <small>
                            {tf("studio.review.revisionPlanner.productionDraft", { id: activeRevisionRunPlan.productionWorkflowDraftRef.draftId })}
                            {" · "}
                            {t("studio.review.revisionPlanner.versionPlanned")}
                          </small>
                        ) : activeRevisionRunPlan.status === "PREVIEWED" ? (
                          <button
                            disabled={revisionRunPlanBusy}
                            onClick={() => void confirmRevisionPlan()}
                            type="button"
                          >
                            {revisionRunPlanBusy ? t("studio.common.confirming") : t("studio.review.revisionPlanner.confirm")}
                          </button>
                        ) : (
                          <small>{t("studio.review.revisionPlanner.blocked")}</small>
                        )}
                      </>
                    ) : (
                      <p>{t("studio.review.revisionPlanner.empty")}</p>
                    )}
                    <small>{t("studio.review.revisionPlanner.boundary")}</small>
                  </div>
                  <div className="studio-client-review-revision">
                    <header>
                      <strong>{t("studio.review.revisionDraft.title")}</strong>
                      <span>{latestRevision?.status || t("studio.review.revisionDraft.notCreated")}</span>
                    </header>
                    {latestRevision ? (
                      <>
                        <dl>
                          <div><dt>{t("studio.review.revisionDraft.comments")}</dt><dd>{latestRevision.impact.commentCount}</dd></div>
                          <div><dt>{t("studio.review.revisionDraft.targets")}</dt><dd>{latestRevision.impact.targetCount}</dd></div>
                          <div><dt>{t("studio.production.shots")}</dt><dd>{latestRevision.impact.affectedShotIds.length}</dd></div>
                          <div><dt>{t("studio.review.revisionDraft.workflowImpact")}</dt><dd>{t("studio.review.revisionDraft.newOnly")}</dd></div>
                        </dl>
                        {latestRevision.workflowDraftRef ? (
                          <small>
                            {tf("studio.review.revisionDraft.workflowDraft", { id: latestRevision.workflowDraftRef.draftId, status: latestRevision.workflowDraftRef.status })}
                          </small>
                        ) : (
                          <small>{t("studio.review.revisionDraft.previewOnly")}</small>
                        )}
                      </>
                    ) : (
                      <p>{t("studio.review.revisionDraft.empty")}</p>
                    )}
                    {latestRevision?.status === "PREVIEW" ? (
                      <button
                        disabled={clientReviewBusy}
                        onClick={() => void confirmRevisionRequest()}
                        type="button"
                      >
                        {clientReviewBusy ? t("studio.common.confirming") : t("studio.review.revisionDraft.confirm")}
                      </button>
                    ) : (
                      <button
                        disabled={clientReviewBusy || !activeClientReview.session.comments.some((comment) => comment.status === "OPEN")}
                        onClick={() => void previewRevisionRequest()}
                        type="button"
                      >
                        {clientReviewBusy ? t("studio.storyboard.preparing") : t("studio.review.revisionDraft.preview")}
                      </button>
                    )}
                  </div>
                  <small>{t("studio.clientReview.boundary")}</small>
                </>
              ) : clientReviewError ? (
                <>
                  <strong>{t("studio.clientReview.unavailable")}</strong>
                  <p>{clientReviewError}</p>
                </>
              ) : (
                <p>{t("studio.clientReview.loading")}</p>
              )}
            </section>
            {message ? <small role="status">{message}</small> : null}
          </aside>
        </div>
      )}
    </section>
  );
}

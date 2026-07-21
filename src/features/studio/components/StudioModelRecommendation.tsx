"use client";

import { useEffect, useRef, useState } from "react";
import {
  STUDIO_CREATIVE_CAPABILITY_CHOICES,
  type StudioCapabilityIntentResolution,
} from "@/features/studio/capabilities/studioCreativeIntent";
import {
  createStudioModelRecommendationContext,
  createStudioModelRecommendationPatch,
  type StudioModelRecommendation,
  type StudioModelRecommendationCandidate,
  type StudioModelRecommendationContext,
  type StudioModelRecommendationInput,
} from "@/features/studio/capabilities/studioModelRecommendation";
import type { StudioProviderModelInventory } from "@/features/studio/capabilities/studioVideoModelResolver";
import { recordStudioModelRecommendationSelection } from "@/lib/studio-model-recommendation-api";
import { resolveStudioCapabilityIntent } from "@/lib/studio-capability-intent-api";
import {
  formatStudioCapabilityLabel,
  type StudioCapabilityExecutionPlan,
} from "@/features/studio/capabilities/studioCapabilityExecutionPlan";
import {
  STUDIO_CREATIVE_AGENT_PROGRESS,
  STUDIO_CREATIVE_AGENT_FEEDBACK_OPTIONS,
  studioCreativeAgentProgressState,
  type StudioCreativeAgentFeedback,
  type StudioCreativeAgentFeedbackType,
  type StudioCreativeAgentSession,
} from "@/features/studio/capabilities/studioCreativeAgentSession";
import {
  confirmStudioCreativeAgentSession,
  createStudioCreativeAgentSession,
  getStudioCreativeAgentSession,
  submitStudioCreativeAgentFeedback,
} from "@/lib/studio-creative-agent-api";
import {
  getStudioExecutionNodeSymbol,
  STUDIO_EXECUTION_GATE_LABELS,
  type StudioExecutionStatus,
  type StudioWorkflowExecutionPlan,
} from "@/features/studio/capabilities/studioWorkflowExecutionPlan";
import {
  confirmStudioWorkflowExecutionPlan,
  executeStudioWorkflowNode,
  getStudioWorkflowExecutionStatus,
} from "@/lib/studio-workflow-execution-api";
import {
  deleteStudioProjectAgentMemory,
  getStudioProjectAgentContext,
  updateStudioProjectAgentContext,
  type StudioProjectContextUpdate,
} from "@/lib/studio-agent-context-api";
import {
  formatStudioMemoryContent,
  type StudioProjectAgentContextBundle,
} from "@/features/studio/capabilities/studioCreativeAgentMemory";
import type {
  StudioCreativeWorkflowTemplateBundle,
} from "@/features/studio/capabilities/studioCreativeWorkflowTemplate";
import { getStudioProjectWorkflowTemplates } from "@/lib/studio-workflow-template-api";
import type { StudioCreativeWorkflowReview } from "@/features/studio/capabilities/studioCreativeWorkflowReview";
import {
  replanStudioCreativeWorkflowNode,
  updateStudioCreativeWorkflowReview,
} from "@/lib/studio-creative-workflow-review-api";
import {
  studioAgentTaskSymbol,
  type StudioCreativeAgentRole,
  type StudioCreativeAgentTaskBundle,
} from "@/features/studio/capabilities/studioCreativeAgentCollaboration";
import {
  getStudioCreativeAgentRoles,
  getStudioProjectAgentTasks,
} from "@/lib/studio-agent-collaboration-api";
import type { StudioAgentTeamPlanBundle } from "@/features/studio/capabilities/studioDynamicAgentTeamPlan";
import {
  approveStudioAgentTeamPlan,
  createStudioAgentTeamPlan,
  getStudioProjectAgentTeamPlan,
} from "@/lib/studio-agent-team-plan-api";
import {
  studioCheckpointTypeForRole,
  type StudioAgentTaskRuntime,
  type StudioAgentTaskRuntimeBundle,
} from "@/features/studio/capabilities/studioAgentTaskRuntime";
import {
  getStudioProjectAgentTaskRuntime,
  submitStudioAgentTaskCheckpoint,
} from "@/lib/studio-agent-task-runtime-api";

type Preference = StudioModelRecommendationInput["userPreference"]["priority"];

export function StudioModelRecommendation({
  inventory,
  prompt,
  duration,
  ratio,
  qualityGoal,
  referenceMedia,
  projectId,
  sourceNodeId,
  onApply,
  onObserved,
  onExecutionMaterialized,
}: {
  inventory: StudioProviderModelInventory;
  prompt: string;
  duration: number;
  ratio: string;
  qualityGoal: string;
  referenceMedia: StudioModelRecommendationInput["referenceMedia"];
  projectId: string;
  sourceNodeId: string;
  onApply: (patch: Record<string, unknown>) => void;
  onObserved: (context: StudioModelRecommendationContext) => void;
  onExecutionMaterialized: () => Promise<void>;
}) {
  const [preference, setPreference] = useState<Preference>("balanced");
  const [recommendationState, setRecommendationState] = useState<{
    key: string;
    value: StudioModelRecommendation;
  } | null>(null);
  const [intentState, setIntentState] = useState<{ key: string; value: StudioCapabilityIntentResolution } | null>(null);
  const [agentState, setAgentState] = useState<{ key: string; value: StudioCreativeAgentSession } | null>(null);
  const [planState, setPlanState] = useState<{ key: string; value: StudioCapabilityExecutionPlan } | null>(null);
  const [executionPlanState, setExecutionPlanState] = useState<StudioWorkflowExecutionPlan | null>(null);
  const [executionStatus, setExecutionStatus] = useState<StudioExecutionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [confirmingPlan, setConfirmingPlan] = useState(false);
  const [confirmingExecution, setConfirmingExecution] = useState(false);
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<StudioCreativeAgentFeedbackType>("PLAN_GOOD");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackState, setFeedbackState] = useState<{ sessionId: string; value: StudioCreativeAgentFeedback } | null>(null);
  const [feedbackError, setFeedbackError] = useState("");
  const [projectContext, setProjectContext] = useState<StudioProjectAgentContextBundle | null>(null);
  const [projectContextDraft, setProjectContextDraft] = useState<StudioProjectContextUpdate>({
    brandContext: "",
    visualStyle: "",
    characters: [],
    preferredModels: [],
    creativeGoals: [],
  });
  const [projectContextStatus, setProjectContextStatus] = useState<"idle" | "saving">("idle");
  const [projectContextError, setProjectContextError] = useState("");
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const [workflowTemplates, setWorkflowTemplates] = useState<StudioCreativeWorkflowTemplateBundle | null>(null);
  const [selectedWorkflowTemplateId, setSelectedWorkflowTemplateId] = useState<string | null>(null);
  const [workflowTemplateIgnored, setWorkflowTemplateIgnored] = useState(false);
  const [workflowTemplateError, setWorkflowTemplateError] = useState("");
  const [workflowReview, setWorkflowReview] = useState<StudioCreativeWorkflowReview | null>(null);
  const [workflowReviewMode, setWorkflowReviewMode] = useState<"EDIT" | "REPLAN" | null>(null);
  const [workflowReviewNodeId, setWorkflowReviewNodeId] = useState<string | null>(null);
  const [workflowReviewInstruction, setWorkflowReviewInstruction] = useState("");
  const [workflowReviewReason, setWorkflowReviewReason] = useState("");
  const [workflowReviewBusy, setWorkflowReviewBusy] = useState(false);
  const [workflowReviewError, setWorkflowReviewError] = useState("");
  const [agentRoles, setAgentRoles] = useState<StudioCreativeAgentRole[]>([]);
  const [agentTasks, setAgentTasks] = useState<StudioCreativeAgentTaskBundle | null>(null);
  const [agentTeamError, setAgentTeamError] = useState("");
  const [agentTeamPlan, setAgentTeamPlan] = useState<StudioAgentTeamPlanBundle | null>(null);
  const [agentTeamPlanBusy, setAgentTeamPlanBusy] = useState(false);
  const [agentTeamPlanError, setAgentTeamPlanError] = useState("");
  const [agentTaskRuntime, setAgentTaskRuntime] = useState<StudioAgentTaskRuntimeBundle | null>(null);
  const [agentTaskRuntimeBusyId, setAgentTaskRuntimeBusyId] = useState<string | null>(null);
  const [agentTaskRuntimeError, setAgentTaskRuntimeError] = useState("");
  const [error, setError] = useState("");
  const materializedExecutionNodes = useRef(new Set<string>());
  const referenceSignature = referenceMedia.map((item) => item.type).sort().join(",");
  const recommendationKey = JSON.stringify({
    providerId: inventory.providerId,
    duration,
    prompt,
    qualityGoal,
    ratio,
    referenceSignature,
    preference,
  });
  const recommendation = recommendationState?.key === recommendationKey
    ? recommendationState.value
    : null;
  const intentResolution = intentState?.key === recommendationKey ? intentState.value : null;
  const currentAgentTeamPlan = agentTeamPlan?.teamPlan?.intent.intentId === intentResolution?.intent.intentId
    ? agentTeamPlan
    : null;
  const currentAgentTaskRuntime = agentTaskRuntime?.runtime?.teamPlanId === currentAgentTeamPlan?.teamPlan?.teamPlanId
    ? agentTaskRuntime
    : null;
  const currentAgentTaskRuntimeSnapshot = currentAgentTaskRuntime?.runtime || null;
  const agentSession = agentState?.key === recommendationKey ? agentState.value : null;
  const capabilityPlan = planState?.key === recommendationKey ? planState.value : null;
  const executionPlan = executionPlanState?.sourcePlanId === capabilityPlan?.planId
    ? executionPlanState
    : null;
  const executionFailure = executionStatus?.nodes.find((node) => node.status === "FAILED")?.failure || null;
  const currentWorkflowTemplates = workflowTemplates?.projectId === projectId ? workflowTemplates : null;
  const suggestedWorkflowTemplate = currentWorkflowTemplates?.templates[0] || null;
  const activeWorkflowTemplateId = currentWorkflowTemplates?.templates.some((template) => template.templateId === selectedWorkflowTemplateId)
    ? selectedWorkflowTemplateId
    : null;

  const adoptProjectContext = (bundle: StudioProjectAgentContextBundle) => {
    setProjectContext(bundle);
    setProjectContextDraft({
      brandContext: bundle.context.brandContext,
      visualStyle: bundle.context.visualStyle,
      characters: bundle.context.characters,
      preferredModels: bundle.context.preferredModels,
      creativeGoals: bundle.context.creativeGoals,
    });
  };

  const refreshAgentTeam = async () => {
    if (!projectId) return;
    const [roles, tasks] = await Promise.all([
      getStudioCreativeAgentRoles(),
      getStudioProjectAgentTasks(projectId),
    ]);
    setAgentRoles(roles.roles);
    setAgentTasks(tasks);
    setAgentTeamError("");
  };

  const planAgentTeam = async () => {
    if (!projectId || !intentResolution || agentTeamPlanBusy) return;
    setAgentTeamPlanBusy(true);
    setAgentTeamPlanError("");
    try {
      setAgentTeamPlan(await createStudioAgentTeamPlan({
        projectId,
        intent: {
          intentId: intentResolution.intent.intentId,
          intentType: intentResolution.intent.intentType,
        },
        capabilities: intentResolution.intent.capabilities,
      }));
      setAgentTaskRuntime(null);
    } catch {
      setAgentTeamPlanError("Agent Team planning is temporarily unavailable.");
    } finally {
      setAgentTeamPlanBusy(false);
    }
  };

  const approveAgentTeamPlan = async () => {
    if (!projectId || !currentAgentTeamPlan?.teamPlan || agentTeamPlanBusy) return;
    setAgentTeamPlanBusy(true);
    setAgentTeamPlanError("");
    try {
      const approved = await approveStudioAgentTeamPlan(currentAgentTeamPlan.teamPlan.teamPlanId, projectId);
      setAgentTeamPlan(approved);
      try {
        setAgentTaskRuntime(await getStudioProjectAgentTaskRuntime(projectId));
        setAgentTaskRuntimeError("");
      } catch {
        setAgentTaskRuntimeError("The approved Team Plan is waiting for Runtime status refresh.");
      }
    } catch {
      setAgentTeamPlanError("This Agent Team Plan could not be approved.");
    } finally {
      setAgentTeamPlanBusy(false);
    }
  };

  const refreshAgentTaskRuntime = async () => {
    if (!projectId) return;
    setAgentTaskRuntimeError("");
    try {
      setAgentTaskRuntime(await getStudioProjectAgentTaskRuntime(projectId));
    } catch {
      setAgentTaskRuntimeError("Agent Task Runtime is temporarily unavailable.");
    }
  };

  const approveAgentTaskCheckpoint = async (task: StudioAgentTaskRuntime) => {
    if (!projectId || agentTaskRuntimeBusyId) return;
    setAgentTaskRuntimeBusyId(task.runtimeTaskId);
    setAgentTaskRuntimeError("");
    try {
      setAgentTaskRuntime(await submitStudioAgentTaskCheckpoint({
        runtimeTaskId: task.runtimeTaskId,
        projectId,
        type: studioCheckpointTypeForRole(task.roleId),
        decision: "APPROVE",
      }));
    } catch {
      setAgentTaskRuntimeError("This Human Checkpoint could not be recorded.");
    } finally {
      setAgentTaskRuntimeBusyId(null);
    }
  };

  useEffect(() => {
    let active = true;
    if (!projectId) return () => { active = false; };
    void Promise.all([getStudioCreativeAgentRoles(), getStudioProjectAgentTasks(projectId)])
      .then(([roles, tasks]) => {
        if (!active) return;
        setAgentRoles(roles.roles);
        setAgentTasks(tasks);
        setAgentTeamError("");
      })
      .catch(() => { if (active) setAgentTeamError("Agent Team is temporarily unavailable."); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    let active = true;
    if (!projectId) return () => { active = false; };
    void getStudioProjectAgentTaskRuntime(projectId)
      .then((bundle) => {
        if (!active) return;
        setAgentTaskRuntime(bundle);
        setAgentTaskRuntimeError("");
      })
      .catch(() => { if (active) setAgentTaskRuntimeError("Agent Task Runtime is temporarily unavailable."); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    let active = true;
    if (!projectId) return () => { active = false; };
    void getStudioProjectAgentTeamPlan(projectId)
      .then((bundle) => {
        if (!active) return;
        setAgentTeamPlan(bundle);
        setAgentTeamPlanError("");
      })
      .catch(() => { if (active) setAgentTeamPlanError("Agent Team Plan is temporarily unavailable."); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    let active = true;
    if (!projectId) return () => { active = false; };
    void getStudioProjectAgentContext(projectId)
      .then((bundle) => {
        if (!active) return;
        setProjectContext(bundle);
        setProjectContextDraft({
          brandContext: bundle.context.brandContext,
          visualStyle: bundle.context.visualStyle,
          characters: bundle.context.characters,
          preferredModels: bundle.context.preferredModels,
          creativeGoals: bundle.context.creativeGoals,
        });
      })
      .catch(() => { if (active) setProjectContextError("Project Context is temporarily unavailable."); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    let active = true;
    if (!projectId) return () => { active = false; };
    void getStudioProjectWorkflowTemplates(projectId)
      .then((bundle) => {
        if (!active) return;
        setWorkflowTemplates(bundle);
        setSelectedWorkflowTemplateId(null);
        setWorkflowTemplateIgnored(false);
        setWorkflowTemplateError("");
      })
      .catch(() => { if (active) setWorkflowTemplateError("Workflow suggestions are temporarily unavailable."); });
    return () => { active = false; };
  }, [projectId]);

  const observeExecutionStatus = async (status: StudioExecutionStatus) => {
    setExecutionStatus(status);
    if (agentSession) {
      void getStudioCreativeAgentSession(agentSession.sessionId).then((bundle) => {
        setAgentState({ key: recommendationKey, value: bundle.session });
        if (bundle.creativePlan) setPlanState({ key: recommendationKey, value: bundle.creativePlan });
        if (bundle.executionPlan) setExecutionPlanState(bundle.executionPlan);
      }).catch(() => undefined);
    }
    const completed = status.nodes.find((node) =>
      node.status === "COMPLETED" &&
      node.resultBindings?.timeline.status === "BOUND" &&
      node.resultBindings?.output.status === "BOUND"
    );
    if (!completed || materializedExecutionNodes.current.has(completed.executionNodeId)) return;
    await onExecutionMaterialized();
    materializedExecutionNodes.current.add(completed.executionNodeId);
  };

  const planningInput = {
    projectId,
    prompt,
    media: referenceMedia,
    constraints: { duration, ratio, resolution: qualityGoal, audio: false },
    userPreferences: { priority: preference },
    ...(activeWorkflowTemplateId ? { workflowTemplateId: activeWorkflowTemplateId } : {}),
  } as const;

  const saveProjectContext = async () => {
    if (!projectId || projectContextStatus === "saving") return;
    setProjectContextStatus("saving");
    setProjectContextError("");
    try {
      adoptProjectContext(await updateStudioProjectAgentContext(projectId, projectContextDraft));
    } catch {
      setProjectContextError("Project Context could not be saved.");
    } finally {
      setProjectContextStatus("idle");
    }
  };

  const deleteProjectMemory = async (memoryId: string) => {
    if (!projectId || deletingMemoryId) return;
    setDeletingMemoryId(memoryId);
    setProjectContextError("");
    try {
      await deleteStudioProjectAgentMemory(projectId, memoryId);
      adoptProjectContext(await getStudioProjectAgentContext(projectId));
    } catch {
      setProjectContextError("This Memory could not be deleted.");
    } finally {
      setDeletingMemoryId(null);
    }
  };

  const requestRecommendation = async () => {
    setLoading(true);
    setError("");
    try {
      const resolution = await resolveStudioCapabilityIntent(planningInput);
      const value = resolution.recommendations;
      setIntentState({ key: recommendationKey, value: resolution });
      setRecommendationState({ key: recommendationKey, value });
      const context = createStudioModelRecommendationContext(value);
      if (context) onObserved(context);
    } catch {
      setRecommendationState(null);
      setIntentState(null);
      setError("Creative intent routing is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const startCreativeAgent = async () => {
    setPlanning(true);
    setError("");
    setFeedbackState(null);
    setFeedbackType("PLAN_GOOD");
    setFeedbackRating(5);
    setFeedbackComment("");
    setFeedbackError("");
    try {
      const bundle = await createStudioCreativeAgentSession(planningInput);
      setAgentState({ key: recommendationKey, value: bundle.session });
      setPlanState(bundle.creativePlan ? { key: recommendationKey, value: bundle.creativePlan } : null);
      setExecutionPlanState(bundle.executionPlan);
      setExecutionStatus(null);
      setExecutingNodeId(null);
      if (projectId) void getStudioProjectAgentContext(projectId).then(adoptProjectContext).catch(() => undefined);
      if (projectId) void refreshAgentTeam().catch(() => setAgentTeamError("Agent Team is temporarily unavailable."));
      if (bundle.session.status === "FAILED") {
        setError(bundle.session.error?.message || "Creative Agent could not build a safe plan.");
      }
    } catch {
      setAgentState(null);
      setPlanState(null);
      setError("Creative Agent planning is temporarily unavailable.");
    } finally {
      setPlanning(false);
    }
  };

  const confirmPlan = async () => {
    if (!agentSession || !capabilityPlan) return;
    setConfirmingPlan(true);
    setError("");
    try {
      const bundle = await confirmStudioCreativeAgentSession(agentSession.sessionId);
      setAgentState({ key: recommendationKey, value: bundle.session });
      setPlanState(bundle.creativePlan ? { key: recommendationKey, value: bundle.creativePlan } : null);
      setExecutionPlanState(bundle.executionPlan);
      setExecutionStatus(null);
      setExecutingNodeId(null);
    } catch {
      setError("This workflow cannot be confirmed until every readiness and cost blocker is cleared.");
    } finally {
      setConfirmingPlan(false);
    }
  };

  const confirmExecution = async () => {
    if (!executionPlan || executionPlan.status !== "READY") return;
    setConfirmingExecution(true);
    setError("");
    try {
      const confirmed = await confirmStudioWorkflowExecutionPlan(executionPlan.executionPlanId);
      setExecutionPlanState(confirmed);
      try {
        await observeExecutionStatus(await getStudioWorkflowExecutionStatus(confirmed.executionPlanId));
      } catch {
        setError("Execution Plan is confirmed, but its read-only queue status is temporarily unavailable.");
      }
    } catch {
      setError("Execution confirmation is blocked by the current readiness, verified scope, or cost gate.");
    } finally {
      setConfirmingExecution(false);
    }
  };

  const refreshExecutionStatus = async () => {
    if (!executionPlan || executionPlan.status !== "CONFIRMED") return;
    setError("");
    try {
      await observeExecutionStatus(await getStudioWorkflowExecutionStatus(executionPlan.executionPlanId));
    } catch {
      setError("Execution queue status is temporarily unavailable.");
    }
  };

  const executeNode = async (executionNodeId: string) => {
    if (!executionPlan || executionPlan.status !== "CONFIRMED" || executingNodeId || !projectId || !sourceNodeId) return;
    setExecutingNodeId(executionNodeId);
    setError("");
    try {
      await observeExecutionStatus(await executeStudioWorkflowNode(executionNodeId, {
        prompt,
        materialization: { projectId, sourceNodeId },
      }));
    } catch {
      setError("Controlled node execution is unavailable. The Runtime bridge may be disabled or a gate may have changed.");
    } finally {
      setExecutingNodeId(null);
    }
  };

  const submitAgentFeedback = async () => {
    if (!agentSession || !["COMPLETED", "FAILED"].includes(agentSession.status) || submittingFeedback) return;
    setSubmittingFeedback(true);
    setFeedbackError("");
    try {
      const value = await submitStudioCreativeAgentFeedback(agentSession.sessionId, {
        feedbackType,
        rating: feedbackRating,
        comment: feedbackComment,
      });
      setFeedbackState({ sessionId: agentSession.sessionId, value });
      if (projectId) void getStudioProjectAgentContext(projectId).then(adoptProjectContext).catch(() => undefined);
      if (projectId) void getStudioProjectWorkflowTemplates(projectId).then(setWorkflowTemplates).catch(() => undefined);
    } catch {
      setFeedbackError("Feedback could not be recorded. Your result and execution state were not changed.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const adoptWorkflowReview = (bundle: Awaited<ReturnType<typeof updateStudioCreativeWorkflowReview>>) => {
    setWorkflowReview(bundle.review);
    setAgentState({ key: recommendationKey, value: bundle.session });
    setPlanState({ key: recommendationKey, value: bundle.creativePlan });
  };

  const openWorkflowReview = async () => {
    if (!agentSession || workflowReviewBusy) return;
    setWorkflowReviewBusy(true);
    setWorkflowReviewError("");
    try {
      adoptWorkflowReview(await updateStudioCreativeWorkflowReview(agentSession.sessionId, { action: "CREATE" }));
    } catch {
      setWorkflowReviewError("Human review is available only before an Execution Plan is prepared.");
    } finally {
      setWorkflowReviewBusy(false);
    }
  };

  const updateWorkflowNodeLock = async (nodeId: string, locked: boolean) => {
    if (!agentSession || workflowReviewBusy) return;
    setWorkflowReviewBusy(true);
    setWorkflowReviewError("");
    try {
      adoptWorkflowReview(await updateStudioCreativeWorkflowReview(agentSession.sessionId, {
        action: locked ? "UNLOCK_NODE" : "LOCK_NODE",
        nodeId,
        reason: locked ? "Unlocked by user" : "Locked by user",
      }));
    } catch {
      setWorkflowReviewError("This node lock could not be updated.");
    } finally {
      setWorkflowReviewBusy(false);
    }
  };

  const submitWorkflowNodeChange = async () => {
    if (!agentSession || !workflowReviewNodeId || !workflowReviewMode || !workflowReviewInstruction.trim() || workflowReviewBusy) return;
    setWorkflowReviewBusy(true);
    setWorkflowReviewError("");
    try {
      const input = { nodeId: workflowReviewNodeId, instruction: workflowReviewInstruction, reason: workflowReviewReason };
      const bundle = workflowReviewMode === "REPLAN"
        ? await replanStudioCreativeWorkflowNode(agentSession.sessionId, input)
        : await updateStudioCreativeWorkflowReview(agentSession.sessionId, { action: "EDIT_NODE", ...input });
      adoptWorkflowReview(bundle);
      setWorkflowReviewMode(null);
      setWorkflowReviewNodeId(null);
      setWorkflowReviewInstruction("");
      setWorkflowReviewReason("");
    } catch {
      setWorkflowReviewError("Locked nodes cannot be changed. Unlock the node or review your instruction.");
    } finally {
      setWorkflowReviewBusy(false);
    }
  };

  const confirmWorkflowReview = async () => {
    if (!agentSession || !workflowReview || workflowReviewBusy) return;
    setWorkflowReviewBusy(true);
    setWorkflowReviewError("");
    try {
      adoptWorkflowReview(await updateStudioCreativeWorkflowReview(agentSession.sessionId, {
        action: "CONFIRM_REVIEW",
        reason: workflowReviewReason || "Human-reviewed workflow approved",
      }));
      setExecutionPlanState(null);
      setExecutionStatus(null);
    } catch {
      setWorkflowReviewError("The reviewed draft could not be confirmed. No execution was started.");
    } finally {
      setWorkflowReviewBusy(false);
    }
  };

  const apply = (candidate: StudioModelRecommendationCandidate) => {
    try {
      const selectedAt = new Date().toISOString();
      const context = recommendation
        ? createStudioModelRecommendationContext(recommendation, candidate.modelId, selectedAt)
        : null;
      onApply(createStudioModelRecommendationPatch(inventory, candidate, context));
      if (context) {
        void recordStudioModelRecommendationSelection(
          context.recommendationId,
          candidate.modelId,
          candidate.providerId,
        ).catch(() => undefined);
      }
      setError("");
    } catch {
      setError("This recommendation is stale. Refresh the model inventory and try again.");
    }
  };

  return (
    <section className="studio-model-recommendation" aria-label="Smart model recommendation">
      <div className="studio-intent-routing">
        <strong>What do you want to create?</strong>
        <span>Describe the result in your Prompt. Studio recommends a Capability first, then a safe model.</span>
        <div className="studio-intent-capability-grid" aria-label="Creative capability examples">
          {STUDIO_CREATIVE_CAPABILITY_CHOICES.map((choice) => (
            <div className={intentResolution?.capability?.capabilityId === choice.capabilityId ? "is-recommended" : ""} key={choice.capabilityId}>
              <strong>{choice.label}</strong>
              <span>{choice.example}</span>
            </div>
          ))}
        </div>
        {projectId ? (
          <details className="studio-agent-context">
            <summary>
              <span>Project Context</span>
              <strong>Agent remembers {projectContext?.memoryCount || 0} preferences</strong>
            </summary>
            <div className="studio-agent-context-summary">
              <div><span>Brand</span><strong>{projectContext?.context.brandContext || "Not set"}</strong></div>
              <div><span>Style</span><strong>{projectContext?.context.visualStyle || "Not set"}</strong></div>
              <div><span>Character</span><strong>{projectContext?.context.characters[0] || "Not set"}</strong></div>
            </div>
            <div className="studio-agent-context-form">
              <label><span>Brand context</span><input maxLength={1000} onChange={(event) => setProjectContextDraft((current) => ({ ...current, brandContext: event.target.value }))} placeholder="Luxury, cinematic, playful…" value={projectContextDraft.brandContext} /></label>
              <label><span>Visual style</span><input maxLength={1000} onChange={(event) => setProjectContextDraft((current) => ({ ...current, visualStyle: event.target.value }))} placeholder="Noir lighting, warm palette…" value={projectContextDraft.visualStyle} /></label>
              <label><span>Characters</span><input onChange={(event) => setProjectContextDraft((current) => ({ ...current, characters: event.target.value.split(",").map((value) => value.trim()) }))} placeholder="Main Hero, Product Host" value={projectContextDraft.characters.join(", ")} /></label>
              <label><span>Creative goals</span><input onChange={(event) => setProjectContextDraft((current) => ({ ...current, creativeGoals: event.target.value.split(",").map((value) => value.trim()) }))} placeholder="Launch campaign, product story" value={projectContextDraft.creativeGoals.join(", ")} /></label>
              <label><span>Preferred models</span><input onChange={(event) => setProjectContextDraft((current) => ({ ...current, preferredModels: event.target.value.split(",").map((value) => value.trim()) }))} placeholder="seedance_2_0" value={projectContextDraft.preferredModels.join(", ")} /></label>
              <button className="studio-node-action" disabled={projectContextStatus !== "idle"} onClick={() => void saveProjectContext()} type="button">{projectContextStatus === "saving" ? "Saving Context…" : "Save Project Context"}</button>
              <small>Only explicit input from this project is saved. Context never bypasses model availability, verified scope, readiness, or cost checks.</small>
            </div>
            {projectContext?.memories.length ? (
              <div className="studio-agent-memory-list" aria-label="Agent Memories used by this project">
                {projectContext.memories.map((memory) => (
                  <article key={memory.memoryId}>
                    <div><strong>{memory.type.replaceAll("_", " ")}</strong><span>{formatStudioMemoryContent(memory)}</span><small>{Math.round(memory.confidence * 100)}% confidence · {memory.source.replaceAll("_", " ")}</small></div>
                    <button disabled={Boolean(deletingMemoryId)} onClick={() => void deleteProjectMemory(memory.memoryId)} type="button">{deletingMemoryId === memory.memoryId ? "Deleting…" : "Delete"}</button>
                  </article>
                ))}
              </div>
            ) : null}
            {projectContextError ? <span className="studio-agent-context-error" role="alert">{projectContextError}</span> : null}
          </details>
        ) : null}
        {suggestedWorkflowTemplate ? (
          <section className={`studio-workflow-template-suggestion${activeWorkflowTemplateId === suggestedWorkflowTemplate.templateId ? " is-selected" : ""}${workflowTemplateIgnored ? " is-ignored" : ""}`} aria-label="Suggested Workflow">
            <div className="studio-workflow-template-heading">
              <div><span>Suggested Workflow</span><strong>{suggestedWorkflowTemplate.name}</strong></div>
              <span>{Math.round(suggestedWorkflowTemplate.successMetrics.qualityScore)} quality score</span>
            </div>
            <p>Based on your previous successful projects</p>
            <ol>
              {suggestedWorkflowTemplate.nodes.map((node, index) => (
                <li key={`${node.capability}-${index}`}>
                  <span>{index + 1}</span>
                  <strong>{formatStudioCapabilityLabel(node.capability)}</strong>
                </li>
              ))}
            </ol>
            <div className="studio-workflow-template-metrics">
              <span>{suggestedWorkflowTemplate.successMetrics.completionRate}% completion</span>
              <span>{suggestedWorkflowTemplate.successMetrics.userRating === null ? "No rating" : `${suggestedWorkflowTemplate.successMetrics.userRating}/5 rating`}</span>
              <span>{suggestedWorkflowTemplate.sourceCount} successful source{suggestedWorkflowTemplate.sourceCount === 1 ? "" : "s"}</span>
            </div>
            <div className="studio-workflow-template-actions">
              <button
                className="studio-node-action"
                onClick={() => {
                  setSelectedWorkflowTemplateId(suggestedWorkflowTemplate.templateId);
                  setWorkflowTemplateIgnored(false);
                }}
                type="button"
              >
                {activeWorkflowTemplateId === suggestedWorkflowTemplate.templateId ? "Workflow selected" : "Use workflow"}
              </button>
              <button
                onClick={() => {
                  setSelectedWorkflowTemplateId(null);
                  setWorkflowTemplateIgnored(true);
                }}
                type="button"
              >Ignore</button>
            </div>
            <small>{workflowTemplateIgnored ? "Suggestion ignored. The default Creative Plan remains unchanged." : "A template changes planning only after you choose Use workflow; execution still requires confirmation."}</small>
          </section>
        ) : workflowTemplateError ? <span className="studio-agent-context-error" role="alert">{workflowTemplateError}</span> : null}
        {intentResolution ? (
          <div className="studio-intent-result" role="status">
            <span>Detected intent: {intentResolution.intent.intentType.replaceAll("_", " ")}</span>
            <strong>{intentResolution.capability?.name || "No supported Capability detected"}</strong>
            <span>{Math.round(intentResolution.intent.confidence * 100)}% confidence</span>
            {intentResolution.blockers.length ? <span>Blocked: {intentResolution.blockers.join(", ")}</span> : null}
          </div>
        ) : null}
        {intentResolution && !agentSession ? (
          <button
            aria-label="Create Creative Plan — Review Plan"
            className="studio-node-action studio-creative-plan-review"
            disabled={planning}
            onClick={() => void startCreativeAgent()}
            type="button"
          >
            {planning ? "Creative Agent is planning..." : "Start Creative Agent Beta"}
          </button>
        ) : null}
        {agentSession ? (
          <section className={`studio-creative-agent is-${agentSession.status.toLowerCase()}`} aria-label="Creative Agent">
            <div className="studio-creative-agent-heading">
              <div>
                <span>Creative Agent</span>
                <strong>Beta</strong>
              </div>
              <span>{agentSession.status.replaceAll("_", " ")}</span>
            </div>
            <div className="studio-creative-agent-goal">
              <span>Your goal</span>
              <strong>{prompt || "Describe what you want to create."}</strong>
            </div>
            {agentSession.planningContext ? (
              <div className="studio-creative-agent-context-used">
                <span>Context used</span>
                <strong>{agentSession.planningContext.memoryCount} project memories</strong>
                <small>{agentSession.planningContext.projectContext.visualStyle || agentSession.planningContext.projectContext.brandContext || "Project preferences applied"}</small>
              </div>
            ) : null}
            {capabilityPlan?.workflowTemplateSelection?.mode === "USER_SELECTED" ? (
              <div className="studio-creative-agent-context-used">
                <span>Workflow template used</span>
                <strong>{capabilityPlan.workflowTemplateSuggestion?.name || "Project workflow"}</strong>
                <small>Selected by you; all model readiness, verified scope, and cost gates still apply.</small>
              </div>
            ) : null}
            <section className="studio-agent-team-planner" aria-label="Agent Team Planner">
              <div className="studio-agent-team-planner-heading">
                <div><span>Agent Team Planner</span><strong>Human controlled</strong></div>
                <span>{currentAgentTeamPlan?.teamPlan?.status.replaceAll("_", " ") || "NOT PLANNED"}</span>
              </div>
              {!currentAgentTeamPlan?.teamPlan ? (
                <button
                  className="studio-node-action"
                  disabled={agentTeamPlanBusy || !intentResolution}
                  onClick={() => void planAgentTeam()}
                  type="button"
                >
                  {agentTeamPlanBusy ? "Planning Agent Team..." : "Plan Agent Team"}
                </button>
              ) : (
                <>
                  <div className="studio-agent-team-planner-roles">
                    {currentAgentTeamPlan.selectedRoles.map((role) => <span key={role.roleId}>{role.name}</span>)}
                  </div>
                  <ol className="studio-agent-team-allocations">
                    {currentAgentTeamPlan.teamPlan.tasks.map((task) => {
                      const role = currentAgentTeamPlan.selectedRoles.find((candidate) => candidate.roleId === task.roleId);
                      return (
                        <li key={task.taskId}>
                          <span>{task.priority}</span>
                          <div>
                            <strong>{role?.name || task.roleId.replaceAll("_", " ")}</strong>
                            <small>{task.reason}</small>
                            <small>{task.dependencies.length ? `After ${task.dependencies.join(", ")}` : "Starting task"}</small>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  {currentAgentTeamPlan.teamPlan.status === "WAITING_HUMAN" ? (
                    <button className="studio-node-action" disabled={agentTeamPlanBusy} onClick={() => void approveAgentTeamPlan()} type="button">
                      {agentTeamPlanBusy ? "Saving approval..." : "Approve Team Plan"}
                    </button>
                  ) : <span role="status">Team allocation approved. Tasks still require separate Human Review.</span>}
                </>
              )}
              <small>Planning selects roles, task reasons, priority, and dependencies only. It never runs a Task, changes the project, calls a Provider, or charges Credits.</small>
              {agentTeamPlanError ? <span role="alert">{agentTeamPlanError}</span> : null}
            </section>
            {currentAgentTeamPlan?.teamPlan?.status === "APPROVED" ? (
              <section className="studio-agent-task-control" aria-label="Agent Task Control Center">
                <div className="studio-agent-task-control-heading">
                  <div><span>Agent Task Control Center</span><strong>Governed Runtime</strong></div>
                  <span>{currentAgentTaskRuntimeSnapshot?.status.replaceAll("_", " ") || "SYNC PENDING"}</span>
                </div>
                {currentAgentTaskRuntimeSnapshot ? (
                  <ol className="studio-agent-runtime-tasks">
                    {currentAgentTaskRuntimeSnapshot.tasks.map((task) => {
                      const role = currentAgentTeamPlan.selectedRoles.find((candidate) => candidate.roleId === task.roleId);
                      const checkpoint = [...currentAgentTaskRuntimeSnapshot.checkpoints].reverse().find((candidate) => candidate.runtimeTaskId === task.runtimeTaskId);
                      return (
                        <li className={`is-${task.status.toLowerCase().replaceAll("_", "-")}`} key={task.runtimeTaskId}>
                          <div className="studio-agent-runtime-task-title">
                            <strong>{role?.name || task.roleId.replaceAll("_", " ")}</strong>
                            <span>{task.status.replaceAll("_", " ")}</span>
                          </div>
                          <small>Approval: {task.approvalState.replaceAll("_", " ")}</small>
                          <small>{task.dependencies.length ? `Waiting on ${task.dependencies.join(", ")}` : "No task dependency"}</small>
                          <small>Checkpoint: {checkpoint ? `${checkpoint.type.replaceAll("_", " ")} / ${checkpoint.decision}` : "Not recorded"}</small>
                          <small>Output: {task.outputRefs.length ? task.outputRefs.join(", ") : "No output yet"}</small>
                          {task.status === "WAITING_HUMAN" ? (
                            <button className="studio-node-action" disabled={Boolean(agentTaskRuntimeBusyId)} onClick={() => void approveAgentTaskCheckpoint(task)} type="button">
                              {agentTaskRuntimeBusyId === task.runtimeTaskId ? "Saving Checkpoint..." : `Approve ${studioCheckpointTypeForRole(task.roleId).replaceAll("_", " ")}`}
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                ) : <span role="status">The approved Team Plan has no Runtime snapshot yet.</span>}
                <button className="studio-agent-runtime-refresh" onClick={() => void refreshAgentTaskRuntime()} type="button">Refresh Task Status</button>
                <small>Checkpoints govern approval metadata only. They never execute a Task, call a Provider, generate media, or charge Credits; Execution Confirm remains separate.</small>
                {agentTaskRuntimeError ? <span role="alert">{agentTaskRuntimeError}</span> : null}
              </section>
            ) : null}
            <section className="studio-agent-team" aria-label="Agent Team">
              <div className="studio-agent-team-heading">
                <div><span>Agent Team</span><strong>Human Review</strong></div>
                <span>Draft only</span>
              </div>
              <ol>
                {agentRoles.map((role) => {
                  const task = agentTasks?.tasks.find((candidate) => candidate.sessionId === agentSession.sessionId && candidate.roleId === role.roleId);
                  return (
                    <li className={`is-${(task?.status || "PENDING").toLowerCase().replaceAll("_", "-")}`} key={role.roleId}>
                      <span aria-hidden="true">{studioAgentTaskSymbol(task?.status || "PENDING")}</span>
                      <div><strong>{role.name}</strong><small>{task ? task.status.replaceAll("_", " ") : "PENDING"}</small></div>
                    </li>
                  );
                })}
              </ol>
              <small>Every role output waits for Human Review. No Agent can execute, charge Credits, or change this project.</small>
              {agentTeamError ? <span role="alert">{agentTeamError}</span> : null}
            </section>
            <ol className="studio-creative-agent-progress" aria-label="Creative Agent progress">
              {STUDIO_CREATIVE_AGENT_PROGRESS.map((step) => {
                let state = studioCreativeAgentProgressState(agentSession.status, step.key);
                if (agentSession.executionPlanId && step.key === "preparing") state = "completed";
                if (executionStatus?.planStatus === "EXECUTING" && step.key === "generating") state = "active";
                if (executionStatus?.planStatus === "FAILED" && step.key === "generating") state = "failed";
                if (executionStatus?.planStatus === "COMPLETED") state = "completed";
                return (
                  <li className={`is-${state}`} key={step.key}>
                    <span aria-hidden="true">{state === "completed" ? "✓" : state === "active" ? "●" : state === "failed" ? "×" : "○"}</span>
                    <strong>{step.label}</strong>
                  </li>
                );
              })}
            </ol>
            {agentSession.status === "FAILED" ? (
              <div className="studio-creative-agent-failure" role="alert">
                <strong>{agentSession.executionPlanId ? "Generation failed" : "Planning failed"}</strong>
                <span>Reason: {agentSession.error?.message || executionFailure?.code || "No safe workflow is currently available."}</span>
                <span>No retry was started.</span>
              </div>
            ) : null}
            {agentSession.creativePlanId && ["COMPLETED", "FAILED"].includes(agentSession.status) ? (
              <section className="studio-creative-agent-feedback" aria-label="Creative Agent feedback">
                {feedbackState?.sessionId === agentSession.sessionId ? (
                  <div className="studio-creative-agent-feedback-thanks" role="status">
                    <strong>Thanks for your feedback.</strong>
                    <span>{feedbackState.value.rating}/5 · {feedbackState.value.feedbackType.replaceAll("_", " ")}</span>
                    <span>This is an optimization signal only. Nothing was regenerated or changed.</span>
                  </div>
                ) : (
                  <>
                    <div><strong>Was this plan helpful?</strong><span>Your feedback improves future planning signals.</span></div>
                    <fieldset>
                      <legend>Plan rating</legend>
                      <div className="studio-creative-agent-rating">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <label key={rating}>
                            <input checked={feedbackRating === rating} name={`agent-rating-${agentSession.sessionId}`} onChange={() => setFeedbackRating(rating)} type="radio" value={rating} />
                            <span>{rating}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <label><span>What should improve?</span><select aria-label="Creative Agent feedback type" onChange={(event) => setFeedbackType(event.target.value as StudioCreativeAgentFeedbackType)} value={feedbackType}>{STUDIO_CREATIVE_AGENT_FEEDBACK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    <label><span>Comment (optional)</span><textarea maxLength={1000} onChange={(event) => setFeedbackComment(event.target.value)} placeholder="Tell us what worked or what should change." value={feedbackComment} /></label>
                    <button className="studio-node-action" disabled={submittingFeedback} onClick={() => void submitAgentFeedback()} type="button">{submittingFeedback ? "Saving feedback..." : "Submit feedback"}</button>
                    {feedbackError ? <span className="studio-creative-agent-feedback-error" role="alert">{feedbackError}</span> : null}
                    <small>Feedback never retries, regenerates, switches models, or charges Credits.</small>
                  </>
                )}
              </section>
            ) : null}
          </section>
        ) : null}
        {capabilityPlan ? (
          <section className="studio-creative-plan" aria-label="Creative Plan">
            <div className="studio-creative-plan-heading">
              <div><span>Creative Plan</span><strong>{capabilityPlan.status.replaceAll("_", " ")}</strong></div>
              <span>{capabilityPlan.estimatedCost.estimatedCredits === null ? "Cost unavailable" : `${capabilityPlan.estimatedCost.estimatedCredits} estimated credits`} · {capabilityPlan.estimatedCost.confidence} confidence</span>
            </div>
            {agentSession && capabilityPlan.status === "PLAN_ONLY" && !executionPlan ? (
              <section className="studio-workflow-control-center" aria-label="Agent Workflow Human Control Center">
                <div className="studio-workflow-control-heading">
                  <div><span>Agent Workflow</span><strong>Human Control Center</strong></div>
                  <span>{workflowReview?.status || "NOT REVIEWED"}</span>
                </div>
                {!workflowReview ? (
                  <button className="studio-node-action" disabled={workflowReviewBusy} onClick={() => void openWorkflowReview()} type="button">
                    {workflowReviewBusy ? "Opening review..." : "Review Workflow"}
                  </button>
                ) : (
                  <>
                    <ol className="studio-workflow-review-nodes">
                      {workflowReview.nodes.map((node) => (
                        <li className={node.lockStatus === "LOCKED" ? "is-locked" : ""} key={node.nodeId}>
                          <div>
                            <span aria-hidden="true">{node.lockStatus === "LOCKED" ? "🔒" : node.revisionStatus === "REPLANNED" ? "✏" : "✓"}</span>
                            <div><strong>{formatStudioCapabilityLabel(node.capability)}</strong><small>{node.humanInstructions || node.revisionStatus.replaceAll("_", " ")}</small></div>
                          </div>
                          <div>
                            <button disabled={workflowReviewBusy || workflowReview.status === "CONFIRMED"} onClick={() => void updateWorkflowNodeLock(node.nodeId, node.lockStatus === "LOCKED")} type="button">{node.lockStatus === "LOCKED" ? "Unlock" : "Lock"}</button>
                            <button disabled={workflowReviewBusy || workflowReview.status === "CONFIRMED" || node.lockStatus === "LOCKED"} onClick={() => { setWorkflowReviewNodeId(node.nodeId); setWorkflowReviewMode("EDIT"); setWorkflowReviewInstruction(node.humanInstructions || ""); }} type="button">Edit</button>
                            <button disabled={workflowReviewBusy || workflowReview.status === "CONFIRMED" || node.lockStatus === "LOCKED"} onClick={() => { setWorkflowReviewNodeId(node.nodeId); setWorkflowReviewMode("REPLAN"); setWorkflowReviewInstruction(node.humanInstructions || ""); }} type="button">Re-plan</button>
                          </div>
                        </li>
                      ))}
                    </ol>
                    {workflowReviewMode && workflowReviewNodeId ? (
                      <div className="studio-workflow-review-editor">
                        <strong>{workflowReviewMode === "REPLAN" ? "Selective Re-plan" : "Edit Node"} · {workflowReviewNodeId}</strong>
                        <label><span>Instruction</span><textarea maxLength={2000} onChange={(event) => setWorkflowReviewInstruction(event.target.value)} placeholder="Describe only what should change in this node." value={workflowReviewInstruction} /></label>
                        <label><span>Reason</span><input maxLength={1000} onChange={(event) => setWorkflowReviewReason(event.target.value)} placeholder="Why should this node change?" value={workflowReviewReason} /></label>
                        <div><button className="studio-node-action" disabled={workflowReviewBusy || !workflowReviewInstruction.trim()} onClick={() => void submitWorkflowNodeChange()} type="button">Save {workflowReviewMode === "REPLAN" ? "Re-plan" : "Edit"}</button><button onClick={() => { setWorkflowReviewMode(null); setWorkflowReviewNodeId(null); }} type="button">Cancel</button></div>
                      </div>
                    ) : null}
                    <div className="studio-workflow-review-summary">
                      <span>{workflowReview.lockedNodes.length} locked</span>
                      <span>{workflowReview.changes.length} decisions recorded</span>
                    </div>
                    {workflowReview.status !== "CONFIRMED" ? <button className="studio-node-action" disabled={workflowReviewBusy} onClick={() => void confirmWorkflowReview()} type="button">Confirm Reviewed Plan</button> : <span role="status">Reviewed draft confirmed. Execution still requires the existing Plan and Execution confirmations.</span>}
                    <small>Only the selected unlocked node can change. Confirming creates a new PLAN_ONLY draft; it never executes or charges Credits.</small>
                  </>
                )}
                {workflowReviewError ? <span className="studio-agent-context-error" role="alert">{workflowReviewError}</span> : null}
              </section>
            ) : null}
            <ol className="studio-creative-plan-graph">
              {capabilityPlan.nodes.map((node) => (
                <li className={node.status === "BLOCKED" ? "is-blocked" : ""} key={node.nodeId}>
                  <span>{node.nodeId.replace("node-", "")}</span>
                  <div>
                    <strong>{formatStudioCapabilityLabel(node.capability)}</strong>
                    <small>{node.dependencies.length ? `After ${node.dependencies.join(", ")}` : "Starting step"}</small>
                    {node.recommendation?.modelId ? <small>{node.recommendation.providerId} · {node.recommendation.modelId}</small> : null}
                    {node.blockers.length ? <small>Blocked: {node.blockers.join(", ")}</small> : null}
                  </div>
                </li>
              ))}
            </ol>
            {capabilityPlan.status === "CONFIRMED" ? (
              <div className="studio-creative-plan-confirmed">
                <span role="status">Plan confirmed. Creative Agent prepared the Execution Preview without creating a Job.</span>
              </div>
            ) : (
              <button
                aria-label="Confirm Workflow"
                className="studio-node-action"
                disabled={!capabilityPlan.confirmationAllowed || confirmingPlan}
                onClick={() => void confirmPlan()}
                type="button"
              >
                {confirmingPlan ? "Preparing execution preview..." : "Confirm Plan"}
              </button>
            )}
            <span className="studio-creative-plan-boundary">Plan confirmation never creates a Job, enters Queue, calls a Provider, or deducts Credits; existing Generation Plan controls remain authoritative.</span>
            {executionPlan ? (
              <section className="studio-execution-preview" aria-label="Execution Preview">
                <div className="studio-execution-preview-heading">
                  <div><span>Execution Preview</span><strong>{executionPlan.status}</strong></div>
                  <span>{executionPlan.nodes.length} node{executionPlan.nodes.length === 1 ? "" : "s"} · {executionPlan.estimatedCredits === null ? "Cost unavailable" : `${executionPlan.estimatedCredits} estimated credits`}</span>
                </div>
                <div className="studio-execution-preview-models">
                  {executionPlan.models.map((model) => (
                    <span key={`${model.providerId}:${model.modelId}`}>{model.providerId} / {model.modelId} / {model.verifiedScope || "No verified scope"}</span>
                  ))}
                </div>
                {executionPlan.nodes.map((node) => (
                  <div className={node.status === "BLOCKED" ? "studio-execution-node is-blocked" : "studio-execution-node"} key={node.executionNodeId}>
                    <div><strong>{formatStudioCapabilityLabel(node.capability)}</strong><span>{node.candidateType.replaceAll("_", " ")}</span></div>
                    <div className="studio-execution-gates">
                      {Object.entries(node.gates).map(([name, value]) => (
                        <span className={value.passed ? "is-passed" : "is-blocked"} key={name}>
                          {STUDIO_EXECUTION_GATE_LABELS[name as keyof typeof STUDIO_EXECUTION_GATE_LABELS]}: {value.passed ? "Pass" : value.blocker}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {executionPlan.risks.length ? <p className="studio-execution-risks">Risks: {executionPlan.risks.join(", ")}</p> : null}
                {executionPlan.blockers.length ? <p className="studio-execution-blockers">Blocked: {executionPlan.blockers.join(", ")}</p> : null}
                {executionPlan.status === "CONFIRMED" ? (
                  <div className="studio-execution-confirmed">
                    <span role="status">Execution handoff confirmed. Creating the existing Generation Plan remains a separate explicit user action.</span>
                    <button className="studio-node-action" onClick={() => void refreshExecutionStatus()} type="button">Refresh Status</button>
                  </div>
                ) : (
                  <button
                    className="studio-node-action"
                    disabled={executionPlan.status !== "READY" || confirmingExecution}
                    onClick={() => void confirmExecution()}
                    type="button"
                  >
                    {confirmingExecution ? "Rechecking gates..." : "Confirm Execution Plan"}
                  </button>
                )}
                {executionStatus ? (
                  <section className="studio-execution-queue" aria-label="Execution Queue">
                    <div><strong>Execution Queue</strong><span>{executionStatus.planStatus}</span></div>
                    <ol>
                      {executionStatus.queue.map((item) => {
                        const node = executionStatus.nodes.find((candidate) => candidate.executionNodeId === item.nodeId);
                        return (
                          <li className={`is-${item.status.toLowerCase()}`} key={item.nodeId}>
                            <span aria-hidden="true">{getStudioExecutionNodeSymbol(item.status)}</span>
                            <div>
                              <strong>{node ? formatStudioCapabilityLabel(node.capability) : item.nodeId}</strong>
                              <small>{item.status} · Priority {item.priority}</small>
                              <small>{item.dependenciesResolved ? "Dependencies resolved" : `Waiting for ${node?.dependencies.join(", ") || "dependency"}`}</small>
                              {node?.runtime ? <small>Runtime: {node.runtime.state} via {node.runtime.adapterKey}</small> : null}
                              {node?.resultBindings ? (
                                <small>Timeline {node.resultBindings.timeline.status} · Output {node.resultBindings.output.status}</small>
                              ) : null}
                              {node?.status === "READY" && node.capability === "video_generate" ? (
                                <button
                                  className="studio-node-action studio-execution-node-run"
                                  disabled={Boolean(executingNodeId) || !projectId || !sourceNodeId}
                                  onClick={() => void executeNode(node.executionNodeId)}
                                  type="button"
                                >
                                  {executingNodeId === node.executionNodeId ? "Rechecking gates..." : "Execute Node"}
                                </button>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                    <span>Nodes never run automatically. They run only after an explicit Execute Node action; no batch execution is allowed, and failed nodes are never retried.</span>
                  </section>
                ) : null}
                <span className="studio-creative-plan-boundary">Confirmation creates only the read-only orchestration queue. It does not create a Generation Plan, Job, Generation Queue entry, Usage record, or Credits charge.</span>
              </section>
            ) : null}
          </section>
        ) : null}
      </div>
      <div className="studio-model-recommendation-heading">
        <div>
          <strong>Capability-driven model recommendation</strong>
          <span>Recommendations never change your model until you confirm.</span>
        </div>
        <select
          aria-label="Recommendation priority"
          value={preference}
          onChange={(event) => {
            setPreference(event.target.value as Preference);
            setError("");
          }}
        >
          <option value="balanced">Balanced</option>
          <option value="quality">Best quality</option>
          <option value="reliability">Reliability</option>
          <option value="cost">Lower cost</option>
        </select>
      </div>
      <button
        className="studio-node-action studio-model-recommendation-request"
        disabled={loading || !duration || !ratio || !qualityGoal}
        onClick={() => void requestRecommendation()}
        type="button"
      >
        {loading ? "Resolving intent and verified models..." : "Find capability and model"}
      </button>
      {recommendation?.status === "INSUFFICIENT_DATA" ? (
        <div className="studio-model-recommendation-empty" role="status">
          <strong>No safe recommendation</strong>
          <span>{recommendation.reason}</span>
        </div>
      ) : null}
      {recommendation?.recommended ? (
        <div className="studio-model-recommendation-result" role="status">
          <p>Recommended for your prompt</p>
          <strong>✨ {recommendation.recommended.displayName}</strong>
          <span>{recommendation.recommended.reason}</span>
          {recommendation.personalization?.applied ? (
            <span className="studio-model-recommendation-personalization">
              Personalized · {recommendation.personalization.preferenceType.replaceAll("_", " ")} · {recommendation.personalization.sampleSize} generation signals
            </span>
          ) : (
            <span className="studio-model-recommendation-personalization">
              No personal history applied yet. Global model intelligence was used.
            </span>
          )}
          {recommendation.recommended.preferenceMatch?.reasons?.length ? (
            <span>{recommendation.recommended.preferenceMatch.reasons.join(" · ")}</span>
          ) : null}
          <div className="studio-model-recommendation-facts">
            <span>{recommendation.recommended.scope.duration}s</span>
            <span>{recommendation.recommended.scope.resolution}</span>
            <span>{recommendation.recommended.scope.ratio}</span>
            <span>{recommendation.recommended.estimatedCredits} estimated credits</span>
            <span>{recommendation.recommended.confidence} confidence</span>
          </div>
          <button
            className="studio-node-action"
            onClick={() => apply(recommendation.recommended as StudioModelRecommendationCandidate)}
            type="button"
          >
            Use {recommendation.recommended.displayName}
          </button>
        </div>
      ) : null}
      {recommendation?.alternatives?.length ? (
        <div className="studio-model-recommendation-alternatives">
          <strong>Alternatives</strong>
          {recommendation.alternatives.map((candidate) => (
            <div key={candidate.modelId}>
              <span>{candidate.displayName} · {candidate.estimatedCredits} estimated credits</span>
              <button onClick={() => apply(candidate)} type="button">Use alternative</button>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p className="studio-inspector-error" role="alert">{error}</p> : null}
    </section>
  );
}

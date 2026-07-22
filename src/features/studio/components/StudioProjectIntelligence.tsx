"use client";

import { useEffect, useMemo, useState } from "react";
import {
  STUDIO_PROJECT_KNOWLEDGE_NODE_TYPES,
  studioProjectKnowledgeNodeLabel,
  studioProjectKnowledgeNodeName,
  type StudioProjectKnowledgeGraph,
} from "@/features/studio/capabilities/studioProjectKnowledge";
import { getStudioProjectKnowledge } from "@/lib/studio-project-knowledge-api";

export function StudioProjectIntelligence({ projectId }: { projectId: string }) {
  const [graphState, setGraphState] = useState<{ projectId: string; graph: StudioProjectKnowledgeGraph } | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const graph = graphState?.projectId === projectId ? graphState.graph : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    void getStudioProjectKnowledge(projectId)
      .then((value) => { if (active) { setGraphState({ projectId, graph: value }); setErrorState(null); } })
      .catch(() => { if (active) setErrorState({ projectId, message: "Project Intelligence is temporarily unavailable." }); });
    return () => { active = false; };
  }, [projectId]);

  const groups = useMemo(() => STUDIO_PROJECT_KNOWLEDGE_NODE_TYPES.map((type) => ({ type, nodes: graph?.nodes.filter((node) => node.type === type) || [] })).filter((group) => group.nodes.length), [graph]);

  return (
    <section className="studio-project-intelligence" aria-label="Project Intelligence View">
      <div className="studio-project-intelligence-heading">
        <div><span>Project Intelligence</span><strong>Knowledge Graph</strong></div>
        {graph ? <small>{graph.nodes.length} nodes · {graph.relationships.length} relationships</small> : null}
      </div>
      {graph ? (
        <>
          <div className="studio-project-intelligence-groups" aria-label="Project Knowledge structure">
            {groups.map((group) => (
              <article key={group.type}>
                <div><strong>{studioProjectKnowledgeNodeLabel(group.type)}</strong><span>{group.nodes.length}</span></div>
                <p>{group.nodes.slice(0, 3).map(studioProjectKnowledgeNodeName).join(" · ")}</p>
              </article>
            ))}
          </div>
          <div className="studio-project-intelligence-relations" aria-label="Project Knowledge relationships">
            {Array.from(new Set(graph.relationships.map((item) => item.relationType))).map((relation) => <span key={relation}>{relation.replaceAll("_", " ")}</span>)}
          </div>
          <small>Indexed from this project only. Copilot uses relevant nodes for answers and Draft proposals; it never changes or executes the project.</small>
        </>
      ) : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Building the project index…</span>}
    </section>
  );
}

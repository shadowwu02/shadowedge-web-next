"use client";

import { useState } from "react";
import {
  studioCopilotContextLabel,
  studioCopilotResponseLabel,
  type StudioCopilotConversation,
} from "@/features/studio/capabilities/studioCopilotConversation";
import { studioCopilotDraftLabel } from "@/features/studio/capabilities/studioProjectCopilot";
import { chatWithStudioCopilot } from "@/lib/studio-copilot-conversation-api";

export function StudioCopilotChat({ projectId }: { projectId: string }) {
  const [conversation, setConversation] = useState<StudioCopilotConversation | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    const content = message.trim();
    if (!content || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await chatWithStudioCopilot(projectId, content, conversation?.conversationId);
      setConversation(result.conversation);
      setMessage("");
    } catch {
      setError("Creative Copilot could not answer. No Draft or project change was created.");
    } finally {
      setBusy(false);
    }
  };

  const contextTypes = Array.from(new Set((conversation?.contextUsed || []).map((reference) => reference.type)));

  return (
    <section className="studio-copilot-chat" aria-label="Creative Copilot Chat">
      <div className="studio-copilot-chat-heading"><strong>Creative Copilot Chat</strong><span>Contextual · Project only</span></div>
      {conversation?.messages.length ? (
        <div className="studio-copilot-chat-messages" aria-label="Copilot conversation messages">
          {conversation.messages.map((item) => (
            <article className={item.role === "USER" ? "is-user" : "is-copilot"} key={item.messageId}>
              <span>{item.role === "USER" ? "You" : studioCopilotResponseLabel(item.responseType)}</span>
              <p>{item.content}</p>
              {item.draftProposal ? (
                <div className="studio-copilot-draft-proposal">
                  <strong>{studioCopilotDraftLabel(item.draftProposal.draftType)}</strong>
                  <span>Style: {item.draftProposal.changes.visualStyle}</span>
                  <span>Affected: {item.draftProposal.affected.join(", ").replaceAll("_", " ")}</span>
                  <small>Requires confirmation: YES · Review through the Action Center before creating a Draft.</small>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : <span className="studio-copilot-chat-empty">Ask about this project, request a suggestion, or propose a Draft change.</span>}
      {contextTypes.length ? (
        <div className="studio-copilot-chat-context" aria-label="Context used by Creative Copilot">
          <span>Context used</span>
          {contextTypes.map((type) => <small key={type}>{studioCopilotContextLabel(type)}</small>)}
        </div>
      ) : null}
      <label className="studio-copilot-chat-composer">
        <span>Message</span>
        <textarea maxLength={2000} onChange={(event) => setMessage(event.target.value)} placeholder="Ask about your project or request a Draft proposal…" rows={3} value={message} />
      </label>
      <div className="studio-copilot-chat-actions">
        <button className="studio-node-action" disabled={busy || !message.trim()} onClick={() => void send()} type="button">{busy ? "Thinking…" : "Send"}</button>
        <small>Conversation only. No project modification, execution, generation, Provider call, or Credits charge.</small>
      </div>
      {error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : null}
    </section>
  );
}

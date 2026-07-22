import { apiRequest } from "@/lib/api";
import type { StudioCopilotChatResult, StudioCopilotConversation } from "@/features/studio/capabilities/studioCopilotConversation";

export async function chatWithStudioCopilot(projectId: string, message: string, conversationId?: string) {
  const envelope = await apiRequest<StudioCopilotChatResult>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot/chat`,
    { method: "POST", body: JSON.stringify({ message, conversationId }) },
  );
  if (!envelope.data?.conversation?.conversationId || !envelope.data.reply) throw new Error("Copilot Conversation response was not returned.");
  return envelope.data;
}

export async function getStudioCopilotConversation(projectId: string, conversationId: string) {
  const envelope = await apiRequest<StudioCopilotConversation>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot/conversations/${encodeURIComponent(conversationId)}`,
  );
  if (!envelope.data?.conversationId) throw new Error("Copilot Conversation was not returned.");
  return envelope.data;
}

/**
 * Shared domain-model types used by both the public config layer and
 * internal orchestration code.
 */

export interface AppMetadata {
  appId: string;
  teamId: string;
  tenantId?: string;
  userId?: string;
}

export interface ToolCallRequest {
  id: string;
  callId: string;
  arguments: Record<string, unknown>;
}

export const MessageRole = {
  User: "user",
  Assistant: "assistant",
  System: "system",
  Tool: "tool",
} as const;

export type MessageRoleType = (typeof MessageRole)[keyof typeof MessageRole];

export interface Attachment {
  id: string;
  fileName?: string;
  name?: string;
  mimeType?: string;
  type?: string;
  size: number;
  url?: string;
  data?: string;
  file?: File;
}

export interface ChatMessage {
  id: string;
  role: MessageRoleType;
  content: string;
  timestamp: number;
  toolCalls?: ToolCallRequest[];
  toolCallId?: string;
  metadata?: Record<string, unknown>;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  title?: string;
  contextId?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolCallLogEntry {
  callId: string;
  conversationId: string;
  toolId: string;
  arguments: Record<string, unknown>;
  timestamp: number;
  appMetadata: AppMetadata;
  userId?: string;
  durationMs?: number;
  error?: string;
  result?: unknown;
}

export interface AuraChatHistorySummary {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  messageCount: number;
}

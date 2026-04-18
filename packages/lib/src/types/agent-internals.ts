import type {
  AuraToolRiskType,
  ToolResultContent,
} from "./aura-config.js";
import type { ToolCallRequest } from "./core-types.js";

export type ActionStatusType =
  | "pending"
  | "executing"
  | "completed"
  | "failed"
  | "rejected"
  | "timed-out";

export interface PendingAction {
  id: string;
  toolCall: ToolCallRequest;
  toolName: string;
  title?: string;
  risk?: AuraToolRiskType;
  status: ActionStatusType;
  description: string;
  previewContent?: ToolResultContent[];
  error?: string;
}

export type AgentStepKindType =
  | "thinking"
  | "tool-call"
  | "approval"
  | "ask-user"
  | "skill-select";

export type AgentStepStatusType =
  | "running"
  | "waiting"
  | "complete"
  | "error"
  | "rejected"
  | "timed-out";

export interface AgentStep {
  id: string;
  iteration: number;
  type: AgentStepKindType;
  summary: string;
  status: AgentStepStatusType;
  timestamp: number;
  durationMs?: number;
  detail?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: string;
  pendingAction?: PendingAction;
  userInputQuestion?: string;
}

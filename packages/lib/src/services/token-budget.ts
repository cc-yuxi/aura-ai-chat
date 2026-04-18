import type { ProviderMessage } from "../types/aura-config.js";
import type { ChatMessage } from "../types/index.js";
import { MessageRole } from "../types/index.js";

export interface TrimOptions {
  maxTokens: number;
  estimator?: (text: string) => number;
}

export function estimateTokens(text: string): number {
  // Rough estimate: 4 chars per token
  return Math.ceil(text.length / 4);
}

export function estimateMessagesTokens(messages: ProviderMessage[]): number {
  return messages.reduce((total, msg) => {
    return total + estimateTokens(msg.content) + 4;
  }, 0);
}

export class TokenBudgetService {
  async prepareMessages(
    systemPrompt: string,
    history: ChatMessage[],
    maxBudget: number,
  ): Promise<ProviderMessage[]> {
    const messages: ProviderMessage[] = [
      { role: MessageRole.System, content: systemPrompt },
      ...history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    return trimToTokenBudget(messages, { maxTokens: maxBudget });
  }
}

export function trimToTokenBudget(
  messages: ProviderMessage[],
  options: TrimOptions,
): ProviderMessage[] {
  const { maxTokens, estimator = estimateTokens } = options;

  let currentTokens = 0;
  const systemMsg = messages.find((message) => message.role === MessageRole.System);
  if (systemMsg) {
    currentTokens += estimator(systemMsg.content) + 4;
  }

  const result: ProviderMessage[] = systemMsg ? [systemMsg] : [];
  const others = messages.filter((message) => message.role !== MessageRole.System);

  const keptOthers: ProviderMessage[] = [];
  for (let i = others.length - 1; i >= 0; i--) {
    const message = others[i];
    const tokens = estimator(message.content) + 4;
    if (currentTokens + tokens <= maxTokens) {
      keptOthers.unshift(message);
      currentTokens += tokens;
    } else {
      break;
    }
  }

  return [...result, ...keptOthers];
}

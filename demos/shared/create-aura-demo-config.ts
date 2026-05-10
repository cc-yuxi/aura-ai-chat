import type {
  AuraConfig,
  AuraEvent,
  AuraResource,
  Conversation,
  ChatMessage,
  IConversationManager,
  FeedbackEvent,
  SuggestedPrompt,
} from "aura-ai-chat";

export interface DemoPanelSnapshot {
  title: string;
  metric: string;
  detail: string;
}

interface CreateAuraDemoConfigOptions {
  appId: string;
  framework: string;
  dashboardTitle: string;
  aiName?: string;
  panels: DemoPanelSnapshot[];
  onAuraEvent?: (event: AuraEvent) => void;
}

const conversationStores = new Map<string, Map<string, Conversation>>();

function getConversationStore(appId: string): Map<string, Conversation> {
  let store = conversationStores.get(appId);
  if (!store) {
    store = new Map<string, Conversation>();
    conversationStores.set(appId, store);
  }
  return store;
}

function createConversationManager(appId: string): IConversationManager {
  const store = getConversationStore(appId);

  return {
    async createConversation(conversation?: Conversation) {
      const now = Date.now();
      const value =
        conversation ??
        {
          id: crypto.randomUUID(),
          messages: [],
          createdAt: now,
          updatedAt: now,
          title: "New conversation",
        };

      store.set(value.id, { ...value, messages: [...(value.messages ?? [])] });
      return value;
    },

    async loadConversation(conversationId: string) {
      return store.get(conversationId) ?? null;
    },

    async listConversations() {
      return [...store.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    },

    async saveMessage(conversationId: string, message: ChatMessage) {
      const existing = store.get(conversationId);
      const conversation =
        existing ??
        {
          id: conversationId,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          title: "New conversation",
        };

      conversation.messages = [...conversation.messages, message];
      conversation.updatedAt = Date.now();

      if (!conversation.title || conversation.title === "New conversation") {
        const firstUserMessage = conversation.messages.find(
          (entry) => entry.role === "user" && entry.content.trim(),
        );
        if (firstUserMessage) {
          conversation.title = firstUserMessage.content.slice(0, 60);
        }
      }

      store.set(conversationId, conversation);
    },

    async saveFeedback(feedback: FeedbackEvent) {
      console.log(`[${appId}] Aura feedback`, feedback);
      return true;
    },

    async deleteConversation(conversationId: string) {
      store.delete(conversationId);
    },

    async clearHistory() {
      store.clear();
    },
  };
}

function createDashboardResource(
  appId: string,
  framework: string,
  dashboardTitle: string,
  panels: DemoPanelSnapshot[],
): AuraResource {
  const uri = `local://${appId}/dashboard-snapshot`;

  return {
    uri,
    name: "dashboard-snapshot",
    description: `Current ${framework} demo dashboard layout and KPI summaries.`,
    mimeType: "application/json",
    async read() {
      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(
          {
            framework,
            dashboardTitle,
            generatedAt: new Date().toISOString(),
            panels,
          },
          null,
          2,
        ),
      };
    },
  };
}

function buildSuggestedPrompts(framework: string): SuggestedPrompt[] {
  return [
    {
      title: "Summarize the dashboard",
      promptText: `Summarize what is on this ${framework} demo dashboard in plain English.`,
    },
    {
      title: "Spot the weak area",
      promptText:
        "Which metric looks weakest right now, and what follow-up question should I ask next?",
    },
    {
      title: "Executive recap",
      promptText:
        "Turn this dashboard into a short executive update with one insight and one risk.",
    },
    {
      title: "Suggest one improvement",
      promptText:
        "Recommend one dashboard improvement based on the current panels and explain why it matters.",
    },
  ];
}

export function createAuraDemoConfig(
  options: CreateAuraDemoConfigOptions,
): AuraConfig {
  const aiName = options.aiName ?? "Aura";

  return {
    identity: {
      appMetadata: {
        appId: options.appId,
        teamId: "host-demos",
        tenantId: "local-dev",
        userId: "demo-user",
      },
      aiName,
    },
    appearance: {
      theme: "professional-light",
      headerTitle: `${aiName} Copilot`,
      headerIcon: "insights",
      welcomeMessageTitle: `${options.framework} Dashboard Demo`,
      welcomeMessage:
        "Ask for a summary, an executive recap, or a recommendation based on the current dashboard snapshot.",
      inputPlaceholder: `Ask ${aiName} about this dashboard...`,
      suggestedPrompts: buildSuggestedPrompts(options.framework),
      showCloseButton: false,
      feedbackMode: "hover",
    },
    agent: {
      providers: [
        {
          type: "built-in",
          id: "gitHubCopilot",
          config: {
            rememberToken: true,
            includedModels: ["gpt", "claude"],
            excludedModels: ["gpt-4"],
          },
        },
      ],
      appSystemPrompt: [
        `You are ${aiName}, the analytics copilot for the ${options.framework} host demo.`,
        "Read the dashboard-snapshot resource before describing the current UI.",
        "Keep answers concise, grounded in the provided snapshot, and explicit when you are making a recommendation.",
        "This host demo is read-only. Do not claim to have edited charts, filters, or panels.",
      ].join("\n"),
      additionalSafetyInstructions:
        "If the user asks you to modify the demo, explain that this particular host demo only supports analysis and recommendations.",
      resources: [
        createDashboardResource(
          options.appId,
          options.framework,
          options.dashboardTitle,
          options.panels,
        ),
      ],
      conversationManager: createConversationManager(options.appId),
      feedback: {
        reasonTags: [
          { id: "incorrect", label: "Incorrect" },
          { id: "incomplete", label: "Incomplete" },
          { id: "unclear", label: "Unclear" },
          { id: "not-actionable", label: "Not actionable" },
        ],
        reasonLabel: "What should be improved?",
        commentPlaceholder: "Add detail for the demo log",
      },
      enableStreaming: true,
      maxContextTokens: 4096,
      maxIterations: 6,
      showThinkingProcess: true,
      toolTimeout: 30000,
      confirmationTimeoutMs: 65000,
      enableWebMcp: false,
    },
    onAuraEvent: options.onAuraEvent,
  };
}

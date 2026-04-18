<div align="center">
  <h1>✨ Aura AI Chat</h1>
  <p><strong>Aura AI Chat is a production-grade, framework-agnostic AI chat widget built as a Web Component with Lit 3. You can drop `<aura-chat>` into Angular, React, Vue, or vanilla browser apps and wire it up with providers, tools, skills, conversation storage, approvals, and host-controlled observability.</strong></p>

  <p>This repository is the Aura AI Chat monorepo. The root README now serves as the main documentation for both the workspace and the published library.</p>
  
  <!-- Add your badges here: -->
  <!-- <img src="https://img.shields.io/npm/v/aura-ai-chat?color=success&style=flat-square" alt="npm version" /> -->
</div>

## 🎯 Why I built this?

Aura AI Chat was built to provide a reusable UI layer for agentic product features without rebuilding chat UX from scratch in every app.

I set out with **5 core objectives**:

1. **Maximize reusability:** Provide a framework-agnostic, drop-in Web Component to effortlessly agentify any existing application.
2. **Consistent UI:** Give internal tools a unified, premium AI chat look and feel.
3. **Native Tooling/Skills:** Rely on progressive disclosure (client-side tool calling) rather than dumping massive state into the context window, saving a massive amount of tokens and latency.
4. **WebMCP Bridge:** Make the host website ready for Model Context Protocol integration right out of the box. 
5. **Enterprise Governance:** Provide dedicated channels for enterprise-level observability, custom UI injection, and human-in-the-loop (HITL) execution controls.

## 🎥 See it in Action
*See how Aura AI Chat uses skills configured by the host application through progressive disclosure, invokes Human-in-the-Loop interventions, and natively logs all AI actions within the conversation history and a live event console.*

https://github.com/user-attachments/assets/f07f171a-8c15-4a9e-8d99-de253450327f

## ⚡ Features

- **Framework Agnostic:** Built with Lit Web Components. Works natively in Angular, React, Vue, or Vanilla JS.
- **Agentic Loop:** Full iteration tracking, skills execution, and step-by-step timeline rendering.
- **Human-in-the-Loop:** Explicit support for `safe`, `moderate`, and `destructive` tool categorizations with inline approval/rejection UI.
- **Bring Your Own LLM:** Includes a built-in GitHub Copilot provider, and easily extensible interfaces for any custom LLM or API provider.
- **WebMCP Integration:** Effortlessly export Aura tools to the page and import compatible tools from your browser.

## 🏗️ Project Structure

| Path | Purpose |
| --- | --- |
| 📦 **`packages/lib/`** | Core `aura-ai-chat` library and the vanilla playground |
| 🅰️ **`demos/angular/`** | Angular host app demo with tools, skills, previews, and dashboard workflows |
| ⚛️ **`demos/react/`** | React host demo |
| ⚛️ **`demos/react/`** | Vue host demo |
| 💚 **`demos/vue/`** | Shared demo helpers used by multiple host apps |
| 🛠️ **`scripts/`** | Monorepo helper scripts for demos, release flow, and build tooling |

## 🚀 Getting Started

Install dependencies from the repo root:

```bash
pnpm install
```

Run the vanilla playground:

```bash
pnpm run dev
```

Run a framework demo:

```bash
pnpm run demo angular
pnpm run demo react
pnpm run demo vue
```

Run all demos in parallel:

```bash
pnpm run demo
```

## Install The Library

```bash
npm install aura-ai-chat
```

## Quick Start

```html
<script type="module">
  import "aura-ai-chat";

  const memory = new Map();

  const conversationManager = {
    async createConversation(conversation) {
      const value =
        conversation ??
        {
          id: crypto.randomUUID(),
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          title: "New conversation",
        };

      memory.set(value.id, value);
      return value;
    },

    async loadConversation(id) {
      return memory.get(id) ?? null;
    },

    async listConversations() {
      return [...memory.values()];
    },

    async saveMessage(id, message) {
      const conversation =
        memory.get(id) ??
        {
          id,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          title: "New conversation",
        };

      conversation.messages = [...conversation.messages, message];
      conversation.updatedAt = Date.now();
      memory.set(id, conversation);
    },
  };

  const orderLookupTool = {
    name: "lookup_order",
    description: "Fetch an order summary by id.",
    inputSchema: {
      type: "object",
      properties: {
        orderId: { type: "string" },
      },
      required: ["orderId"],
    },
    async execute(args, ctx) {
      return {
        content: [
          {
            type: "json",
            label: "Order",
            data: {
              orderId: args.orderId,
              status: "processing",
              requestedBy: ctx.userId ?? "unknown",
            },
          },
        ],
      };
    },
  };

  const widget = document.querySelector("aura-chat");
  widget.config = {
    identity: {
      appMetadata: {
        appId: "orders-app",
        teamId: "operations",
        tenantId: "tenant-1",
        userId: "user-42",
      },
      aiName: "Aster",
    },
    appearance: {
      headerTitle: "Aster",
      welcomeMessageTitle: "Need help?",
      welcomeMessage: "Ask about orders, approvals, or operational follow-up.",
      inputPlaceholder: "Message Aster...",
      suggestedPrompts: [
        {
          title: "Check an order",
          promptText: "Look up order ORD-1042",
        },
      ],
      theme: "professional-light",
    },
    agent: {
      providers: [
        {
          type: "built-in",
          id: "gitHubCopilot",
          config: {
            rememberToken: true,
          },
        },
      ],
      appSystemPrompt: "You are a helpful operations assistant.",
      tools: [orderLookupTool],
      conversationManager,
      enableStreaming: true,
      maxContextTokens: 4096,
      maxIterations: 8,
      showThinkingProcess: true,
      toolTimeout: 30000,
      confirmationTimeoutMs: 65000,
      enableWebMcp: false,
    },
    onAuraEvent(event) {
      console.log("Aura event", event.type, event.payload);
    },
  };
</script>

<aura-chat></aura-chat>
```

## Configuration

```ts
interface AuraConfig {
  identity: AuraIdentityConfig;
  appearance?: AuraAppearanceConfig;
  agent?: AuraAgentConfig;
  onAuraEvent?: (event: AuraEvent) => void;
  settingsModalConfig?: SettingsModalConfig;
}
```

### `identity`

```ts
interface AuraIdentityConfig {
  appMetadata: {
    appId: string;
    teamId: string;
    tenantId?: string;
    userId?: string;
  };
  aiName?: string;
}
```

### `appearance`

Use `appearance` for titles, welcome copy, suggested prompts, attachments, and theme.

```ts
interface AuraAppearanceConfig {
  headerTitle?: string;
  headerIcon?: string;
  showSettingsButton?: boolean;
  showCloseButton?: boolean;
  showProviderSelector?: boolean;
  welcomeMessageTitle?: string;
  welcomeMessage?: string;
  suggestedPrompts?: SuggestedPrompt[];
  inputPlaceholder?: string;
  loadingMessage?: string;
  errorMessage?: string;
  retryLabel?: string;
  enableAttachments?: boolean;
  maxAttachmentSize?: number;
  allowedAttachmentTypes?: string[];
  theme?: "light" | "dark" | "professional-light" | "auto";
  primaryColor?: string;
  fontFamily?: string;
}
```

### `agent`

`agent` is the main control surface for providers, prompts, tools, skills, resources, persistence, and orchestration behavior.

```ts
interface AuraAgentConfig {
  providers?: ProviderConfig[];
  appSystemPrompt?: string;
  additionalSafetyInstructions?: string;
  resources?: AuraResource[];
  skills?: Skill[];
  tools?: AuraTool[];
  mcpServers?: McpServerConfig[];
  conversationManager?: IConversationManager;
  conversationId?: string;
  maxContextTokens?: number;
  enableStreaming?: boolean;
  maxIterations?: number;
  showThinkingProcess?: boolean;
  toolTimeout?: number;
  confirmationTimeoutMs?: number;
  enableWebMcp?: boolean;
}
```

## Providers

### Built-in provider

Aura currently ships with a built-in GitHub Copilot provider:

```ts
agent: {
  providers: [
    {
      type: "built-in",
      id: "gitHubCopilot",
      config: {
        rememberToken: true,
      },
    },
  ],
}
```

Default proxy paths:

- `/github/login/device/code`
- `/github/login/oauth/access_token`
- `/github-api/copilot_internal/v2/token`
- `/github-copilot-api/chat/completions`
- `/github-copilot-api/models`
- `/github-copilot-individual-api/models`

The playground and Vite demos wire these routes in their dev configs. Override the endpoints in provider config if your host app uses different proxy paths.

### Custom providers

You can also pass any custom provider that implements `AIProvider`. Extending `BaseProvider` is usually the simplest path.

## Skills, Tools, And Approvals

Aura supports:

- Local tools via `agent.tools`
- Skill groups via `agent.skills`
- Human-in-the-loop approvals for `moderate` and `destructive` tools
- Inline user clarification through the built-in `aura_ask_user` tool

Risk handling:

- No `risk` or `risk: "safe"` executes immediately.
- `risk: "moderate"` waits for explicit user approval.
- `risk: "destructive"` also waits for explicit user approval and is surfaced as destructive in the UI.

Tool results can return mixed content:

- `text`
- `json`
- `image`
- `audio`
- `resource`
- `custom-element`

`custom-element` is especially useful for host-defined previews inside tool results or approval cards.

## Agent Timeline And Events

Each run can emit agent-step metadata such as:

- `thinking`
- `skill-select`
- `tool-call`
- `ask-user`
- `approval`

Key widget events include:

- `message-sent`
- `message-received`
- `tool-start`
- `tool-success`
- `tool-error`
- `skill-selected`
- `agent-loop-started`
- `agent-loop-completed`
- `agent-step-started`
- `agent-step-completed`
- `debug`
- `error`

Use `onAuraEvent` for logging, analytics, or audit streams. You can also attach the included event monitor component:

```html
<aura-chat id="chat"></aura-chat>
<aura-event-monitor id="monitor"></aura-event-monitor>

<script type="module">
  const chat = document.getElementById("chat");
  const monitor = document.getElementById("monitor");

  chat.config = {
    /* ... */
    onAuraEvent(event) {
      monitor.pushEvent(event);
    },
  };
</script>
```

## WebMCP

Set `agent.enableWebMcp = true` to enable WebMCP bridging.

Current behavior:

- Aura exports registered tools to `navigator.modelContext` as `aura:<toolName>`
- Aura imports compatible page-level MCP tools and exposes them to the agent
- Exported tool annotations are derived from tool `title` and `risk`

If `navigator.modelContext` is unavailable, Aura quietly skips the bridge.

## Themes And Host Control

Built-in themes:

- `light`
- `dark`
- `professional-light`
- `auto`

For settings control, use `settingsModalConfig`:

```ts
settingsModalConfig: {
  readonly: true,
  editableFields: ["theme", "copilotRemember"],
}
```

## Playground And Demos

The repo includes:

- A vanilla playground in `packages/lib/playground`
- Angular, React, and Vue host demos in `demos/*`

The demos are configured to follow the live workspace library source so they stay aligned with current `packages/lib` changes during development.

The playground showcases:

- one-skill multi-tool orchestration
- multi-skill handoff across research, risk, and execution
- human-in-the-loop approval flows
- fallback tool usage when no specialist skill is selected
- live event monitoring

## 📦 Build And Publish

Build the library:

```bash
pnpm run build
```

Publish flow:

```bash
npm login
pnpm changeset
pnpm version
pnpm release
```

After publishing:

```bash
npm install aura-ai-chat
```

## License

MIT

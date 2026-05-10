/**
 * Public API barrel for `@aura/lib`.
 *
 * Design principle: a consumer only needs `AuraConfig` and the types it
 * references. Everything else is internal orchestration.
 *
 * The only extras are:
 *  - Provider implementations (`GitHubCopilotProvider`, `createProviders`)
 *    so consumers can create instances to pass into `AuraAgentConfig.providers`.
 *  - Theme objects (`lightTheme`, `darkTheme`, `professionalLightTheme`) to
 *    pass into `AuraAppearanceConfig.theme`.
 *  - `AuraEventMonitorElement` as an optional debug/audit component.
 */

// ── Side-effect registrations (register Web Components) ───────────────────
import "./components/aura-chat/aura-chat.js";
import "./components/aura-event-monitor/aura-event-monitor.js";

// ── AuraConfig and all types it references ────────────────────────────────
// These are the only types a consumer needs to configure the chat.
export type {
  // Root config — the single entry point
  AuraConfig,
  AuraIdentityConfig,
  AuraAppearanceConfig,
  AuraAgentConfig,
  AuraFeedbackConfig,
  AppMetadata,

  // Provider config — shapes passed into AuraAgentConfig.providers
  AIProvider,
  ProviderConfig,
  BuiltInProviderConfig,
  CustomProviderConfig,
  ProviderOptions,

  // Tool contract — implement AuraTool to pass into AuraAgentConfig.tools
  AuraTool,
  AuraToolResult,
  ToolExecutionContext,
  ToolResultContent,
  AuraToolRiskType,
  // Content part types (return values inside AuraToolResult)
  TextContent,
  ImageContent,
  AudioContent,
  EmbeddedResource,
  CustomElementContent,
  ContentAnnotations,
  TextResourceContents,
  BlobResourceContents,

  // Skill — passed into AuraAgentConfig.skills
  Skill,

  // Resource — passed into AuraAgentConfig.resources
  AuraResource,

  // Conversation storage — implement IConversationManager for AuraAgentConfig.conversationManager
  IConversationManager,
  FeedbackEvent,
  FeedbackReasonTag,
  ChatMessage,
  Conversation,
  Attachment,
  ToolCallLogEntry,

  // Event callback — used in AuraConfig.onAuraEvent
  AuraEvent,

  // Appearance types
  SuggestedPrompt,
  RichContent,
} from "./types/index.js";

// ── Runtime enums needed to work with the above types ─────────────────────
export {
  AuraEventType,   // compare event.type in onAuraEvent callback
  AuraToolRisk,    // set tool.risk when implementing AuraTool
  MessageRole,     // use when implementing IConversationManager
} from "./types/index.js";

// ── Components ────────────────────────────────────────────────────────────
// AuraChat is the only component consumers embed directly.
export { AuraChat } from "./components/aura-chat/aura-chat.js";
// Optional debug/audit component.
export { AuraEventMonitorElement } from "./components/aura-event-monitor/aura-event-monitor.js";

// ── Provider implementations ──────────────────────────────────────────────
// Consumers instantiate these and pass them into AuraConfig.agent.providers.
export { createProviders, BaseProvider, GitHubCopilotProvider } from "./providers/index.js";
export type { GitHubCopilotProviderConfig } from "./providers/index.js";

// ── Themes ────────────────────────────────────────────────────────────────
// Theme objects are passed into AuraConfig.appearance.theme.
export type { AuraTheme } from "./themes/index.js";
export { lightTheme, darkTheme, professionalLightTheme } from "./themes/index.js";

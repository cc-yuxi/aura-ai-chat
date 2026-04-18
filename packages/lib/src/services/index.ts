/**
 * Internal services barrel.
 *
 * This file is intentionally not re-exported from the package root.
 */
export { CommunicationManager } from "./communication-manager.js";
export { EventBus, AUDIT_EVENT_NAME } from "./event-bus.js";
export { ProviderManager } from "./provider-manager.js";
export { SkillRegistry } from "./skill-registry.js";
export { ToolDispatcher, contentToModelText } from "./tool-dispatcher.js";
export {
  WebMcpBridge,
  ToolExporter,
  ToolImporter,
  supportsWebMcp,
} from "./webmcp-bridge.js";
export { SseMcpClient } from "./mcp-sse-client.js";

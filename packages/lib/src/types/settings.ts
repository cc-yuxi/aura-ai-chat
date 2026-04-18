/**
 * @internal
 * Internal-only settings types for the `aura-settings` component.
 * NOT part of the public API — do not re-export from `types/index.ts`.
 */

/**
 * Valid field IDs for the settings modal.
 * Used internally by `aura-settings` to control field visibility and editability.
 */
export type SettingsFieldId =
  | "appId"
  | "teamId"
  | "tenantId"
  | "userId"
  | "aiName"
  | "headerTitle"
  | "headerIcon"
  | "welcomeTitle"
  | "welcomeMessage"
  | "inputPlaceholder"
  | "enableStreaming"
  | "enableAttachments"
  | "maxAttachmentSize"
  | "copilotRemember"
  | "systemPrompt"
  | "safetyInstructions"
  | "maxContextTokens"
  | "enableTools"
  | "loadingMessage"
  | "errorMessage"
  | "retryLabel"
  | "maxIterations"
  | "showThinkingProcess"
  | "toolTimeout"
  | "confirmationTimeoutMs"
  | "enableWebMcp"
  | "theme"
  | "mcpServers"
  | "skills";

/**
 * Controls the visibility and editability of the settings modal.
 * Used internally by `aura-settings` and `aura-chat`.
 */
export interface SettingsModalConfig {
  /** Whether the entire settings panel is read-only. */
  readonly: boolean;
  /** List of fields that remain editable even if panel is read-only. */
  editableFields?: string[];
  /** Explicit list of fields to include. */
  includedFields?: string[];
  /** Explicit list of fields to hide. */
  excludedFields?: string[];
}

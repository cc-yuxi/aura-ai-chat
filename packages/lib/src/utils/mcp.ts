import type {
  AuraTool,
  ToolAnnotations,
} from "../types/aura-config.js";

/**
 * Converts Aura tool metadata to MCP-compatible tool annotations.
 * 
 * @param tool - The Aura tool or a subset containing title and risk.
 * @returns Tool annotations including read-only, destructive, and idempotent hints.
 */
export function auraToMcpAnnotations(
  tool?: Pick<AuraTool, "title" | "risk">,
): ToolAnnotations | undefined {
  if (!tool) return undefined;

  const base: ToolAnnotations = {};
  if (tool.title) base.title = tool.title;

  switch (tool.risk) {
    case "safe":
      base.readOnlyHint = true;
      base.destructiveHint = false;
      base.idempotentHint = true;
      base.openWorldHint = false;
      break;
    case "moderate":
      base.readOnlyHint = false;
      base.destructiveHint = false;
      base.idempotentHint = false;
      base.openWorldHint = false;
      break;
    case "destructive":
      base.readOnlyHint = false;
      base.destructiveHint = true;
      base.idempotentHint = false;
      base.openWorldHint = false;
      break;
    default:
      break;
  }

  return base;
}

/**
 * Checks if a tool execution requires explicit user confirmation based on its risk level.
 * 
 * @param tool - The Aura tool or a subset containing risk information.
 * @returns True if the tool is not considered "safe".
 */
export function needsConfirmation(
  tool?: Pick<AuraTool, "title" | "risk">,
): boolean {
  if (!tool?.risk) return false;
  return tool.risk !== "safe";
}

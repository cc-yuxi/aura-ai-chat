import assert from "node:assert/strict";
import test from "node:test";

import { SkillRegistry } from "../.test-dist/src/services/skill-registry.js";

test("getToolDefinitionsForSkills merges and dedupes tools by tool name", () => {
  const registry = new SkillRegistry();

  registry.registerTools([
    {
      name: "search_tool",
      description: "Search data",
      inputSchema: { type: "object", properties: {} },
      async execute() {
        return { content: [] };
      },
    },
    {
      name: "shared_tool",
      description: "Shared helper",
      inputSchema: { type: "object", properties: {} },
      async execute() {
        return { content: [] };
      },
    },
    {
      name: "chart_tool",
      description: "Create chart",
      inputSchema: { type: "object", properties: {} },
      async execute() {
        return { content: [] };
      },
    },
  ]);

  registry.registerSkills([
    {
      name: "Search",
      description: "Search systems",
      tools: ["search_tool", "shared_tool"],
    },
    {
      name: "Charts",
      description: "Build charts",
      tools: ["shared_tool", "chart_tool"],
    },
  ]);

  const toolNames = registry
    .getToolDefinitionsForSkills(["Search", "Charts"])
    .map((tool) => tool.name);

  assert.deepEqual(toolNames, ["search_tool", "shared_tool", "chart_tool"]);
});

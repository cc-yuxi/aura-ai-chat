import assert from "node:assert/strict";
import test from "node:test";

import { CommunicationManager } from "../.test-dist/src/services/communication-manager.js";
import { SkillRegistry } from "../.test-dist/src/services/skill-registry.js";
import {
  ASK_USER_TOOL_NAME,
  SELECT_SKILLS_TOOL_NAME,
} from "../.test-dist/src/services/prompt-builder.js";

function createRegistry() {
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
      description: "Create charts",
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
      instructions: "Search thoroughly.",
      tools: ["search_tool", "shared_tool"],
    },
    {
      name: "Charts",
      description: "Build charts",
      instructions: "Chart carefully.",
      tools: ["shared_tool", "chart_tool"],
    },
  ]);

  return registry;
}

function createManager(skillRegistry) {
  const historyMessages = [];
  const historyManager = {
    getConversation() {
      return { id: "conv-1" };
    },
    getMessages() {
      return historyMessages;
    },
    async pushAndPersistMessage(message) {
      historyMessages.push(message);
    },
    pushMessage(message) {
      historyMessages.push(message);
    },
    async persistExistingMessage() {},
    replaceMessage() {},
  };

  const eventBus = {
    emit() {},
  };

  const toolRunner = {
    async execute() {
      throw new Error("not used in this test");
    },
  };

  const providerManager = {
    supportsStreaming() {
      return false;
    },
    async sendMessages() {
      throw new Error("not used in this test");
    },
  };

  const config = {
    identity: {
      appMetadata: {
        appId: "app",
        userId: "user",
      },
    },
    agent: {},
  };

  const callbacks = {
    onStepStart() {},
    onStepUpdate() {},
    onStreamDelta() {},
    onMessagePushed() {},
    async requestHumanInTheLoop() {
      return {};
    },
  };

  return new CommunicationManager(
    skillRegistry,
    toolRunner,
    providerManager,
    historyManager,
    eventBus,
    config,
    callbacks,
  );
}

test("CommunicationManager loads and updates multiple active skills conservatively", async () => {
  const registry = createRegistry();
  const manager = createManager(registry);

  const initialTools = manager.resolveToolSet().tools.map((tool) => tool.name);
  assert.deepEqual(initialTools, [SELECT_SKILLS_TOOL_NAME, ASK_USER_TOOL_NAME]);

  await manager.handleActiveSkillsUpdate(
    {
      id: SELECT_SKILLS_TOOL_NAME,
      callId: "call-1",
      arguments: {
        skillNames: ["Search"],
        mode: "replace",
      },
    },
    1,
  );

  assert.deepEqual(
    manager.activeSkills.map((skill) => skill.name),
    ["Search"],
  );

  await manager.handleActiveSkillsUpdate(
    {
      id: SELECT_SKILLS_TOOL_NAME,
      callId: "call-2",
      arguments: {
        skillNames: ["Charts"],
        mode: "add",
      },
    },
    1,
  );

  assert.deepEqual(
    manager.activeSkills.map((skill) => skill.name),
    ["Search", "Charts"],
  );

  const activeTools = manager.resolveToolSet().tools.map((tool) => tool.name);
  assert.deepEqual(activeTools, [
    "search_tool",
    "shared_tool",
    "chart_tool",
    SELECT_SKILLS_TOOL_NAME,
    ASK_USER_TOOL_NAME,
  ]);

  await manager.handleActiveSkillsUpdate(
    {
      id: SELECT_SKILLS_TOOL_NAME,
      callId: "call-3",
      arguments: {
        skillNames: ["Search"],
        mode: "remove",
      },
    },
    1,
  );

  assert.deepEqual(
    manager.activeSkills.map((skill) => skill.name),
    ["Charts"],
  );

  manager.reset();
  assert.deepEqual(manager.activeSkills, []);
});

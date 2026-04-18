import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSystemPrompt,
  DEFAULT_MASTER_SYSTEM_PROMPT,
} from "../.test-dist/src/services/prompt-builder.js";

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

test("buildSystemPrompt orders prompt sections and separates active from inactive skills", () => {
  const prompt = buildSystemPrompt({
    appSystemPrompt: "App prompt",
    additionalSafetyInstructions: "Stay safe\nStay safe\nVerify actions",
    resourceContents: [
      {
        uri: "file://guide",
        name: "Guide",
        description: "Reference guide",
        text: "Line one",
      },
    ],
    activeSkills: [
      {
        name: "Search",
        description: "Search external systems",
        instructions: "Use search before summarizing.",
        tools: ["search_tool"],
      },
      {
        name: "Charts",
        description: "Create charts",
        instructions: "Prefer line charts for trends.",
        tools: ["chart_tool"],
      },
    ],
    skills: [
      { name: "Search", description: "Search external systems" },
      { name: "Charts", description: "Create charts" },
      { name: "Tables", description: "Edit tables" },
    ],
    agenticMode: true,
  });

  assert.ok(prompt.includes(DEFAULT_MASTER_SYSTEM_PROMPT));
  assert.ok(prompt.includes("App prompt"));
  assert.ok(prompt.includes("Agent Loop Rules:"));
  assert.ok(prompt.includes("Safety Instructions:\nStay safe\nVerify actions"));
  assert.ok(prompt.includes("Available Resources:"));
  assert.ok(prompt.includes("Active Skills:"));
  assert.ok(prompt.includes("Instructions:\nUse search before summarizing."));
  assert.ok(prompt.includes("Instructions:\nPrefer line charts for trends."));
  assert.ok(prompt.includes("Available Skills:\n- Tables: Edit tables"));

  const orderedSections = [
    DEFAULT_MASTER_SYSTEM_PROMPT,
    "App prompt",
    "Agent Loop Rules:",
    "Safety Instructions:",
    "Available Resources:",
    "Active Skills:",
    "Available Skills:",
  ];

  let lastIndex = -1;
  for (const section of orderedSections) {
    const nextIndex = prompt.indexOf(section);
    assert.ok(nextIndex > lastIndex, `${section} should appear after the previous section`);
    lastIndex = nextIndex;
  }

  const availableSkillsSection = prompt.slice(prompt.indexOf("Available Skills:"));
  assert.ok(!availableSkillsSection.includes("- Search:"));
  assert.ok(!availableSkillsSection.includes("- Charts:"));
});

test("buildSystemPrompt removes duplicate prompt injections", () => {
  const prompt = buildSystemPrompt({
    appSystemPrompt: DEFAULT_MASTER_SYSTEM_PROMPT,
    additionalSafetyInstructions: "Line A\nLine A\nLine B",
    resourceContents: [
      {
        uri: "file://guide",
        name: "Guide",
        text: "Repeated body",
      },
      {
        uri: "file://guide",
        name: "Guide",
        text: "Repeated body",
      },
    ],
  });

  assert.equal(countOccurrences(prompt, DEFAULT_MASTER_SYSTEM_PROMPT), 1);
  assert.ok(prompt.includes("Safety Instructions:\nLine A\nLine B"));
  assert.equal(countOccurrences(prompt, "- Name: Guide"), 1);
});

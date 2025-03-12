import {
  describe,
  expect,
  test,
  beforeEach,
  jest,
  afterAll,
} from "@jest/globals";
import { ExtractFactsSpecialist } from "./extractFactsSpecialist.js";
import { CoreMessage } from "ai";

describe("ExtractFactsSpecialist with Ollama", () => {
  let specialist: ExtractFactsSpecialist;

  beforeEach(() => {
    specialist = new ExtractFactsSpecialist({
      llm_model: "ollama/qwen2.5",
    });

    jest.setTimeout(60000); // Increase timeout for Ollama calls
  });

  test("should extract facts from user messages", async () => {
    const messages: CoreMessage[] = [
      {
        role: "user",
        content: "My name is John and I work as a software engineer",
      },
      {
        role: "assistant",
        content:
          "Nice to meet you, John! How long have you been working as a software engineer?",
      },
    ];

    const facts = await specialist.extractFacts(messages);

    // Verify extracted facts contain at least one fact about John
    expect(facts.length).toBeGreaterThan(0);
    expect(
      facts.some(
        (fact) =>
          fact.toLowerCase().includes("john") ||
          fact.toLowerCase().includes("software engineer")
      )
    ).toBe(true);
  });

  test("should extract multiple facts from conversations", async () => {
    const messages: CoreMessage[] = [
      { role: "user", content: "I like pizza and coffee. I'm from New York." },
      {
        role: "assistant",
        content:
          "Pizza and coffee are great! New York has amazing options for both.",
      },
    ];

    const facts = await specialist.extractFacts(messages);

    // Verify we got facts
    expect(facts.length).toBeGreaterThan(0);

    // At least one of these facts should be present
    const hasFoodFact = facts.some(
      (fact) =>
        fact.toLowerCase().includes("pizza") ||
        fact.toLowerCase().includes("coffee")
    );

    const hasLocationFact = facts.some((fact) =>
      fact.toLowerCase().includes("new york")
    );

    expect(hasFoodFact || hasLocationFact).toBe(true);
  }, 30000); // Increase timeout to 30 seconds

  test("should handle empty conversations", async () => {
    const messages: CoreMessage[] = [];
    const facts = await specialist.extractFacts(messages);

    // Should return empty array or very few facts
    expect(facts.length).toBeLessThan(2);
  }, 10000); // 10 second timeout

  test("should handle non-factual conversations", async () => {
    const messages: CoreMessage[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there! How can I help you today?" },
    ];

    const facts = await specialist.extractFacts(messages);

    // Should return very few or no facts
    expect(facts.length).toBeLessThan(2);
  }, 10000); // 10 second timeout
});

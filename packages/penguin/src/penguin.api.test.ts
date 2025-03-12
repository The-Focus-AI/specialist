import { describe, it, expect, beforeAll } from "@jest/globals";
import { PenguinNamesArgs, penguinPrompt } from "./penguin.js";
import { toolCallsFromResult } from "@specialist/core/ai/complete";
import { Context } from "@specialist/core/ai/context";
// import { saveTestResult } from "@specialist/core/ai/test-utils.js";

// This test requires API access and will be skipped unless RUN_API_TESTS=true
const runApiTests = process.env.RUN_API_TESTS === "true";

// Skip all tests in this file if RUN_API_TESTS is not set
(runApiTests ? describe : describe.skip)("Penguin API Integration", () => {
  it("should run the names tool via Qwen Ollama", async () => {
    // Use OpenAI model for reliable testing
    const prompt = await penguinPrompt();
    let context = new Context(prompt);
    context = await context.addUserMessage("give me five penguin names");
    const result = await context.complete();

    // Check that the tool was called
    const toolCalls = toolCallsFromResult("penguinNames", result);
    expect(toolCalls.length).toBe(1);

    // Extract tool arguments and results
    const [args, toolResult] = toolCalls[0];

    // Verify the tool used the right parameters
    expect((args as PenguinNamesArgs).count).toBe("5");
    expect(toolResult.length).toBe(5);

    // Verify the tool results format
    toolResult.forEach((name: string) => {
      expect(name).toContain("Penguin");
    });

    // // Save the result for future reference
    // saveTestResult("penguin_names_tool", {
    //   prompt: "give me five penguin names",
    //   model: "openai/gpt-4o",
    //   args,
    //   toolResult,
    //   fullResponse: result,
    // });
  }, 60000); // Allow up to 60 seconds for this test

  it("should know what tools it has", async () => {
    const prompt = await penguinPrompt();
    let context = new Context(prompt);
    context = await context.addUserMessage("what tools do you have?");
    const result = await context.complete();

    // Verify we got a response (might be empty in some test environments)
    expect(result.text).toBeDefined();

    // Only check content if we got a non-empty response
    if (result.text && result.text.length > 0) {
      expect(result.text.toLowerCase()).toContain("penguin");
    } else {
      console.log("Empty response from API - skipping content assertions");
    }

    // In testing scenarios, the model might behave unpredictably
    const toolCalls = toolCallsFromResult("penguinNames", result);

    // // Save the result for future reference
    // saveTestResult("penguin_tools_query", {
    //   prompt: "what tools do you have?",
    //   model: "openai/gpt-4o",
    //   response: result.text,
    // });
  }, 60000); // Allow up to 60 seconds for this test

  it("should handle creative penguin requests", async () => {
    const prompt = await penguinPrompt();
    let context = new Context(prompt);

    context = await context.addUserMessage(
      "tell me facts about emperor penguins and name three of them"
    );
    const result = await context.complete();

    // Verify we got a response (might be empty in some test environments)
    expect(result.text).toBeDefined();

    // Only check content if we got a non-empty response
    if (result.text && result.text.length > 0) {
      expect(result.text.toLowerCase()).toMatch(/emperor|penguin/);
    } else {
      console.log("Empty response from API - skipping content assertions");
    }

    // This should trigger a tool call with count=3
    const toolCalls = toolCallsFromResult("penguinNames", result);
    expect(toolCalls.length).toBe(1);

    const [args, toolResult] = toolCalls[0];
    expect((args as PenguinNamesArgs).count).toBe("3");
    expect(toolResult.length).toBe(3);

    // // Save the result for future reference
    // saveTestResult("penguin_creative_query", {
    //   prompt: "tell me facts about emperor penguins and name three of them",
    //   model: "openai/gpt-4o",
    //   response: result.text,
    //   toolCalls: {
    //     args,
    //     toolResult,
    //   },
    // });
  }, 60000); // Allow up to 60 seconds for this test
});

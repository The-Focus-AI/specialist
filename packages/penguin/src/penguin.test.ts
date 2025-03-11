import { describe, it, expect } from "@jest/globals";
import { penguinPrompt, penguinNames } from "./penguin.js";

// Basic tests that don't require API
describe("penguin prompt", () => {
  it("should be defined", () => {
    expect(penguinPrompt()).toBeDefined();
  });
  
  it("should have the penguinNames tool", async () => {
    const prompt = await penguinPrompt();
    expect(prompt.tools.penguinNames).toBeDefined();
  });
  
  it("should generate penguin names with the expected format", async () => {
    // Test the direct function without API
    const result = await penguinNames.execute({ count: "3" }, { toolCallId: "test", messages: [] });
    
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
    expect(result[0]).toContain("Penguin");
  });
  
  it("should use the correct model in the prompt", async () => {
    const prompt = await penguinPrompt();
    expect(prompt.model).toBeDefined();
    expect(prompt.system).toContain("penguin expert");
  });
});

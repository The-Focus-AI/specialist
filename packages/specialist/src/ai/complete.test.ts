import { describe, it, expect } from "@jest/globals";
import { Context, makePrompt } from "./context.js";
import { modelFromString } from "./models.js";

describe("Context complete method", () => {
  it("should be defined", () => {
    // Use modelFromString which is already properly typed
    const model = modelFromString("ollama/llama3.2");
    const prompt = makePrompt("Test prompt", model);
    const context = new Context(prompt);
    
    expect(context.complete).toBeDefined();
  });
});
import { describe, it, expect } from "@jest/globals";
import { modelFromString, modelStringFromModel } from "./models.js";

describe("modelFromString", () => {
  it("should be defined", () => {
    expect(modelFromString).toBeDefined();
  });

  it("should return an openai model", () => {
    const model = modelFromString("openai/gpt-3.5-turbo");
    expect(model).toBeDefined();
  });

  it("should return an ollama model", () => {
    const model = modelFromString("ollama/llama3.2");
    expect(model).toBeDefined();
  });

  it("should return an groq model", () => {
    const model = modelFromString("groq/llama3.2");
    expect(model).toBeDefined();
  });

  it("should throw an error for unknown model", () => {
    expect(() => modelFromString("unknown/model")).toThrow(
      "Unknown model provider: unknown"
    );
  });
});

describe("modelStringFromModel", () => {
  it("should be defined", () => {
    expect(modelStringFromModel).toBeDefined();
  });

  it("should return an openai model string", () => {
    const model = modelFromString("openai/gpt-3.5-turbo");
    expect(modelStringFromModel(model)).toBe("openai/gpt-3.5-turbo");
  });

  it("should return an ollama model string", () => {
    const model = modelFromString("ollama/llama3.2");
    expect(modelStringFromModel(model)).toBe("ollama/llama3.2");
  });

  it.todo("should return an groq model string");
});

import { describe, it, expect } from "@jest/globals";
import { penguinPrompt, PenguinNamesArgs } from "./penguin.js";
import { complete, toolCallsFromResult } from "../specialist/ai/complete.js";
import { makeContext } from "../specialist/ai/context.js";
import { modelFromString } from "../specialist/ai/models.js";
import childProcess from "child_process";

describe("penguin prompt", () => {
  it("should be defined", () => {
    expect(penguinPrompt()).toBeDefined();
  });

  it("should run the names tool", async () => {
    const prompt = await penguinPrompt();
    const context = makeContext(prompt);
    const result = await complete(context, "give me five penguin names");

    const r = toolCallsFromResult<PenguinNamesArgs>("penguinNames", result);

    expect(r.length).toBe(1);
    const [args, toolResult] = r[0];

    expect(args.count).toBe("5");
    expect(toolResult.length).toBe(5);
    expect(toolResult).toBeDefined();
  });

  it("should know what tools it has", async () => {
    if (!process.env.OPENAI_API_KEY) {
      const cmd = 'op read "op://Development/OpenAI Key/notesPlain"';
      process.env.OPENAI_API_KEY = await childProcess
        .execSync(cmd)
        .toString()
        .trim();
    }

    const prompt = await penguinPrompt();

    prompt.model = modelFromString("openai/gpt-4o");
    const context = makeContext(prompt);

    // console.log("context", JSON.stringify(context, null, 2));
    const result = await complete(context, "what tools do you have?");
    // console.log(JSON.stringify(result.response.messages, null, 2));

    expect(result.text.length).toBeGreaterThan(0);

    expect(result.text).toContain("penguin names");

    const r = toolCallsFromResult<PenguinNamesArgs>("penguinNames", result);

    expect(r.length).toBe(0);

    // console.log("r", JSON.stringify(r, null, 2));

    expect(r.length).toBe(0);
  }, 10000);
});

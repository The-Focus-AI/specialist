import { command, option, restPositionals } from "cmd-ts";
import { Context, makePrompt } from "../ai/context.js";
import { modelStringFromModel } from "../ai/models.js";

export const completeCommand = command({
  name: "complete",
  args: {
    model: option({
      long: "model",
      short: "m",
      description: "The model to use",
      defaultValue: () => "ollama/qwen2.5",
    }),
    prompt: restPositionals({
      description: "The prompt to use",
      displayName: "prompt",
    }),
    file: option({
      long: "file",
      short: "f",
      description: "The file to use",
      defaultValue: () => "",
    }),
  },
  handler: async ({ prompt, model, file }) => {
    const runningPrompt = makePrompt(prompt.join(" "), model);
    console.log("[Model]", modelStringFromModel(runningPrompt.model));
    console.log("[Prompt]", runningPrompt.system);

    const context = new Context(runningPrompt);
    const contextWithPrompt = await context.addUserMessage(prompt.join(" "));
    const result = await contextWithPrompt.complete();
    console.log(result);
  },
});

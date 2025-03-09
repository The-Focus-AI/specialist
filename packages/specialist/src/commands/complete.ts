import { command, option, restPositionals } from "cmd-ts";
import { makeContext, makePrompt } from "../ai/context.js";
import { complete } from "../ai/complete.js";
import { modelStringFromModel } from "../ai/models.js";

export const completeCommand = command({
  name: "complete",
  args: {
    model: option({
      long: "model",
      short: "m",
      description: "The model to use",
      defaultValue: () => "ollama/llama3.2",
    }),
    prompt: restPositionals({
      description: "The prompt to use",
      displayName: "prompt",
    }),
  },
  handler: async ({ prompt, model }) => {
    const runningPrompt = makePrompt(prompt.join(" "), model);
    console.log("[Model]", modelStringFromModel(runningPrompt.model));
    console.log("[Prompt]", runningPrompt.system);

    const context = makeContext(runningPrompt);
    const result = await complete(context, prompt.join(" "));
    console.log(result);
  },
});

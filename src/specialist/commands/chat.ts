import { command, option, restPositionals } from "cmd-ts";
import { makePrompt } from "../ai/context.js";
import { chatWithPrompt } from "../ai/chat.js";
import { modelStringFromModel } from "../ai/models.js";

export const chatCommand = command({
  name: "chat",
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
    const result = await chatWithPrompt(runningPrompt);
    console.log(result);
  },
});

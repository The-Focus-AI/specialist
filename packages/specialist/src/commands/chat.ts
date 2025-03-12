import { command, option, restPositionals, flag } from "cmd-ts";
import { Context, makePrompt } from "../ai/context.js";
import { interactiveChat } from "../ai/chat.js";
import { modelStringFromModel } from "../ai/models.js";
import { MemoryContext } from "src/ai/memory-context.js";
import { addFileToContext } from "src/ai/file.js";
import path from "path";

export const chatCommand = command({
  name: "chat",
  args: {
    model: option({
      long: "model",
      short: "m",
      description: "The model to use",
      defaultValue: () => "ollama/qwen2.5",
    }),
    file: option({
      long: "file",
      short: "f",
      description: "File to analyze (PDF or image)",
      defaultValue: () => "",
    }),
    memory: flag({
      long: "memory",
      description: "Enable memory to remember facts from the conversation",
      defaultValue: () => false,
    }),
    memoryPath: option({
      long: "memory-path",
      description: "Path to store memory files",
      defaultValue: () =>
        path.join(process.env.HOME || "~", ".specialist", "memories"),
    }),
    prompt: restPositionals({
      description: "The prompt to use",
      displayName: "prompt",
    }),
  },
  handler: async ({ prompt, model, file, memory, memoryPath }) => {
    const runningPrompt = makePrompt(prompt.join(" "), model);
    console.log("[Model]", modelStringFromModel(runningPrompt.model));
    console.log("[Prompt]", runningPrompt.system);

    if (memory) {
      console.log("[Memory] Enabled");
    }

    let context = new Context(runningPrompt);
    if (memory) {
      const memoryConfig = { storage_path: memoryPath };

      context = new MemoryContext(runningPrompt, memoryConfig);
    }

    if (file) {
      await addFileToContext(context, file);
    }

    // Start interactive chat (with or without memory)
    await interactiveChat(context);
  },
});

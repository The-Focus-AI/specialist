import { command, option, restPositionals, flag } from "cmd-ts";
import {
  Context,
  makePrompt,
} from "../ai/context.js";
import { interactiveChat } from "../ai/chat.js";
import { modelStringFromModel } from "../ai/models.js";
import { createAttachment } from "../ai/attachments.js";
import fs from "fs-extra";
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

    // Set up memory config if memory is enabled
    const memoryConfig = memory ? { storage_path: memoryPath } : undefined;

    if (file) {
      const filePath = path.resolve(file);
      if (await fs.pathExists(filePath)) {
        console.log(`[File] ${filePath}`);
        // Initialize context with the file
        const context = new Context(runningPrompt);
        try {
          // Create attachment from file
          const attachment = await createAttachment(filePath);
          // Add attachment to context
          const updatedContext = await context.addAttachment(attachment);

          // Start interactive chat with the file-enhanced context
          await interactiveChat(updatedContext.prompt, memoryConfig);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(`Error processing file: ${errorMessage}`);
          process.exit(1);
        }
      } else {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }
    } else {
      // Start interactive chat (with or without memory)
      await interactiveChat(runningPrompt, memoryConfig);
    }
  },
});

import { command, option, restPositionals } from "cmd-ts";
import { makePrompt, makeContext, addAttachmentToContext } from "../ai/context.js";
import { chatWithPrompt } from "../ai/chat.js";
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
      defaultValue: () => "ollama/llama3.2",
    }),
    file: option({
      long: "file",
      short: "f",
      description: "File to analyze (PDF or image)",
    }),
    prompt: restPositionals({
      description: "The prompt to use",
      displayName: "prompt",
    }),
  },
  handler: async ({ prompt, model, file }) => {
    const runningPrompt = makePrompt(prompt.join(" "), model);
    console.log("[Model]", modelStringFromModel(runningPrompt.model));
    console.log("[Prompt]", runningPrompt.system);
    
    if (file) {
      const filePath = path.resolve(file);
      if (await fs.pathExists(filePath)) {
        console.log(`[File] ${filePath}`);
        // Initialize context with the file
        const context = makeContext(runningPrompt);
        try {
          // Create attachment from file
          const attachment = await createAttachment(filePath);
          // Add attachment to context
          const updatedContext = addAttachmentToContext(context, attachment);
          // Start chat with the updated context that includes the file
          await chatWithPrompt(updatedContext.prompt);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Error processing file: ${errorMessage}`);
          process.exit(1);
        }
      } else {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }
    } else {
      // Start chat without a file
      await chatWithPrompt(runningPrompt);
    }
  },
});

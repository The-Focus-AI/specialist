import { command, option, restPositionals, flag } from "cmd-ts";
import {
  makePrompt,
  makeContext,
  addAttachmentToContext,
} from "../ai/context.js";
import { chatWithMemory, chatWithPrompt } from "../ai/chat.js";
import { modelStringFromModel } from "../ai/models.js";
import { createAttachment } from "../ai/attachments.js";
import { MemoryContext } from "../ai/memory-context.js";
import { streamText } from "ai";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "fs-extra";
import path from "path";

/**
 * A simple implementation of chat with memory that doesn't use the complex
 * readline interface in chatWithMemory that might be causing issues
 */
async function simpleMemoryChat(prompt: any, memoryPath: string) {
  console.log("[Simple Memory Chat]");

  // Create memory context
  const memoryContext = new MemoryContext(prompt, {
    storage_path: memoryPath,
    llm_model: modelStringFromModel(prompt.model),
  });

  // Set up readline interface
  const rl = readline.createInterface({ input, output });

  console.log("Memory chat started. Type 'exit' or 'q' to quit.");
  console.log("Special commands:");
  console.log("  ?m - Show memories");

  try {
    while (true) {
      // Get user input
      const userInput = await rl.question(`${prompt.name}> `);

      // Check for exit command
      if (userInput.toLowerCase() === "exit" || userInput === "q") {
        break;
      }

      // Check for memory command
      if (userInput === "?m") {
        const memories = memoryContext.getMemories();
        console.log("\nStored memories:");
        if (memories.length === 0) {
          console.log("No memories stored yet.");
        } else {
          memories.forEach((mem, i) => {
            console.log(`[${i + 1}] ${mem.memory}`);
          });
        }
        console.log();
        continue;
      }

      // Add user message to context
      await memoryContext.addUserMessage(userInput);

      // Enrich context with memories
      await memoryContext.enrichContextWithMemories();

      // Get updated context
      const context = memoryContext.getContext();

      // Generate response
      console.log("\nAssistant: ");

      try {
        const result = streamText({
          model: context.prompt.model,
          messages: context.messages,
        });

        let fullResponse = "";
        for await (const delta of result.textStream) {
          fullResponse += delta;
          process.stdout.write(delta);
        }
        console.log("\n");

        // Save assistant's response to memory
        await memoryContext.addAssistantResponse(fullResponse);
      } catch (error) {
        console.error("Error generating response:", error);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    rl.close();
  }

  console.log("Memory chat ended.");
}

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
    simpleMem: flag({
      long: "simple-memory",
      description: "Use the simplified memory implementation (more stable)",
      defaultValue: () => false,
    }),
    prompt: restPositionals({
      description: "The prompt to use",
      displayName: "prompt",
    }),
  },
  handler: async ({ prompt, model, file, memory, memoryPath, simpleMem }) => {
    const runningPrompt = makePrompt(prompt.join(" "), model);
    console.log("[Model]", modelStringFromModel(runningPrompt.model));
    console.log("[Prompt]", runningPrompt.system);

    if (memory) {
      console.log("[Memory] Enabled");
      if (simpleMem) {
        console.log("[Memory Mode] Simple (more stable)");
      }
    }

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

          if (memory) {
            if (simpleMem) {
              // Use simple memory chat with attachment
              await simpleMemoryChat(updatedContext.prompt, memoryPath);
            } else {
              // Start chat with memory and attachment
              await chatWithMemory(updatedContext.prompt, {
                storage_path: memoryPath,
              });
            }
          } else {
            // Start chat with the updated context that includes the file
            await chatWithPrompt(updatedContext.prompt);
          }
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
      if (memory) {
        if (simpleMem) {
          // Use simple memory chat
          await simpleMemoryChat(runningPrompt, memoryPath);
        } else {
          // Start chat with memory
          await chatWithMemory(runningPrompt, { storage_path: memoryPath });
        }
      } else {
        // Start chat without memory
        await chatWithPrompt(runningPrompt);
      }
    }
  },
});

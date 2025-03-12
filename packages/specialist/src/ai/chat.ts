import { streamText } from "ai";
import { Context, Prompt } from "./context.js";
import { CoreToolMessage } from "ai";
import readline from "node:readline/promises";
import { createAttachment } from "./attachments.js";
import fs from "fs-extra";
import path from "path";
import { MemoryConfig } from "./memory.js";
import { MemoryContext } from "./memory-context.js";
import os from "os";

import { trackUsage } from "./usage.js";
import { modelStringFromModel } from "./models.js";

export async function generate(
  context: Context,
  message: string,
  log: boolean = false, // Default to false to avoid double output in interactiveChat
  maxSteps: number = 5
): Promise<Context> {
  // Create a new context instance
  let newContext = context.clone();

  if (message.startsWith("file:")) {
    const filePath = message.substring(5).trim();
    try {
      if (await fs.pathExists(filePath)) {
        const attachment = await createAttachment(filePath);
        return await newContext.addAttachment(attachment);
      } else {
        console.error(`File not found: ${filePath}`);
        newContext = await newContext.addUserMessage(
          `I tried to attach a file (${filePath}) but it wasn't found.`
        );
        return newContext;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error processing file:", errorMessage);
      newContext = await newContext.addUserMessage(
        `I tried to attach a file but there was an error: ${errorMessage}`
      );
      return newContext;
    }
  } else {
    newContext = await newContext.addUserMessage(message);
  }

  let runError: any;
  let usageData: any = null;
  const startTime = Date.now();

  const result = streamText({
    model: newContext.prompt.model,
    messages: newContext.getMessages(),
    tools: newContext.prompt.tools,
    maxSteps: maxSteps,
    experimental_toolCallStreaming: true,
    onChunk: async ({ chunk }) => {
      if (chunk.type == "tool-call") {
        if (log) {
          console.log("tool-call", chunk.toolName, chunk.args);
        }
      } else if (chunk.type == "tool-result") {
        if (log) {
          console.log("tool-result", chunk.toolName, chunk.result);
          console.log("chunk.result", chunk.result);
        }

        // if (chunk.toolName == "swarmTool" && chunk.result.switch_agent) {
        //   console.log("switching to agent", chunk.result.switch_agent);

        //   context.prompt = await nielsenPrompt();
        // }
      }
    },
    onFinish: async ({ text, toolCalls, toolResults, usage, finishReason }) => {
      if (log) {
        console.log(
          "\nonFinish",
          text,
          toolCalls,
          toolResults,
          usage,
          finishReason
        );

        console.log("finishReason", finishReason);
      }

      // Save usage data for tracking
      usageData = usage;

      if (finishReason == "stop") {
        newContext = await newContext.addAssistantResponse(text);
      } else if (finishReason == "tool-calls") {
        if (log) {
          console.log("tool_use", toolCalls, toolResults);
        }
        // Use the dedicated method for tool messages
        newContext = await newContext.addToolMessage(toolResults);
      } else {
        console.log("****finishReason", finishReason);
      }
      // implement your own storage logic:
      // await saveChat({ text, toolCalls, toolResults });
    },
    onError: (error) => {
      runError = error;
    },
  });

  if (log) {
    process.stdout.write("\nAssistant: ");
  }

  let fullResponse = "";
  for await (const delta of result.textStream) {
    fullResponse += delta;
    if (log) {
      process.stdout.write(delta);
    }
  }

  if (runError) {
    throw runError;
  }

  // Update context usage stats
  if (usageData) {
    newContext.usage.promptTokens += usageData.promptTokens || 0;
    newContext.usage.completionTokens += usageData.completionTokens || 0;
    newContext.usage.totalTokens += usageData.totalTokens || 0;
    newContext.usage.calls += 1;
  }

  // Track global usage
  const duration = Date.now() - startTime;
  await trackUsage({
    timestamp: new Date().toISOString(),
    model: modelStringFromModel(newContext.prompt.model),
    operation: "stream",
    promptTokens: usageData?.promptTokens,
    completionTokens: usageData?.completionTokens,
    totalTokens: usageData?.totalTokens,
    duration,
  });

  return newContext;
}

/**
 * Generate a response using a memory-enabled context
 * This version tracks facts and memories from the conversation
 */
export async function generateWithMemory(
  memoryContext: MemoryContext,
  message: string,
  log: boolean = false, // Default to false to avoid double output in interactiveChat
  maxSteps: number = 5
): Promise<MemoryContext> {
  // Create a new context to work with
  let newContext: MemoryContext = memoryContext;

  // Handle file attachment
  if (message.startsWith("file:")) {
    const filePath = message.substring(5).trim();
    try {
      if (await fs.pathExists(filePath)) {
        const attachment = await createAttachment(filePath);
        // Add the file message to memory context
        const ctx1 = await newContext.addUserMessage(
          `I'm sharing a file: ${path.basename(filePath)}`
        );
        // Add attachment directly
        const ctx2 = await (ctx1 as MemoryContext).addAttachment(attachment);
        newContext = ctx2 as MemoryContext;
      } else {
        console.error(`File not found: ${filePath}`);
        // Add error message
        const ctx = await newContext.addUserMessage(
          `I tried to attach a file (${filePath}) but it wasn't found.`
        );
        return ctx as MemoryContext;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error processing file:", errorMessage);
      // Add error message
      const ctx = await newContext.addUserMessage(
        `I tried to attach a file but there was an error: ${errorMessage}`
      );
      return ctx as MemoryContext;
    }
  } else {
    // Add user message to memory context
    const ctx1 = await newContext.addUserMessage(message);

    // Enrich context with relevant memories before generating response
    const ctx2 = await (ctx1 as MemoryContext).enrichContextWithMemories();
    newContext = ctx2 as MemoryContext;
  }

  let runError: any;
  let usageData: any = null;
  const startTime = Date.now();

  const result = streamText({
    model: newContext.prompt.model,
    messages: newContext.getMessages(),
    tools: newContext.prompt.tools,
    maxSteps: maxSteps,
    experimental_toolCallStreaming: true,
    onChunk: async ({ chunk }) => {
      if (chunk.type == "tool-call") {
        if (log) {
          console.log("tool-call", chunk.toolName, chunk.args);
        }
      } else if (chunk.type == "tool-result") {
        if (log) {
          console.log("tool-result", chunk.toolName, chunk.result);
        }
      }
    },
    onFinish: async ({ text, toolCalls, toolResults, usage, finishReason }) => {
      if (log) {
        console.log("\nonFinish", text, usage, finishReason);
      }

      // Save usage data for tracking
      usageData = usage;

      // Add assistant response to the memory context
      if (finishReason == "stop") {
        const ctx = await newContext.addAssistantResponse(text);
        newContext = ctx as MemoryContext;
      } else if (finishReason == "tool-calls") {
        if (log) {
          console.log("tool_use", toolCalls, toolResults);
        }
        // Add tool message
        const ctx = await newContext.addToolMessage(toolResults);
        newContext = ctx as MemoryContext;
      }
    },
    onError: (error) => {
      runError = error;
    },
  });

  if (log) {
    process.stdout.write("\nAssistant: ");
  }

  let fullResponse = "";
  for await (const delta of result.textStream) {
    fullResponse += delta;
    if (log) {
      process.stdout.write(delta);
    }
  }

  if (runError) {
    throw runError;
  }

  // Update context usage stats
  if (usageData) {
    newContext.usage.promptTokens += usageData.promptTokens || 0;
    newContext.usage.completionTokens += usageData.completionTokens || 0;
    newContext.usage.totalTokens += usageData.totalTokens || 0;
    newContext.usage.calls += 1;
  }

  // Track global usage
  const duration = Date.now() - startTime;
  await trackUsage({
    timestamp: new Date().toISOString(),
    model: modelStringFromModel(newContext.prompt.model),
    operation: "stream-with-memory",
    promptTokens: usageData?.promptTokens,
    completionTokens: usageData?.completionTokens,
    totalTokens: usageData?.totalTokens,
    duration,
  });

  return newContext as MemoryContext;
}

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Unified chat function that handles both regular and memory-enabled contexts
 * @param prompt The prompt to use
 * @param memoryConfig Optional memory configuration (if using memory)
 */
export async function interactiveChat(
  prompt: Prompt,
  memoryConfig?: Partial<MemoryConfig>
) {
  console.log(
    `Starting ${memoryConfig ? "memory-enabled" : "standard"} chat...`
  );

  try {
    // Create context based on whether memory is enabled
    const useMemory = !!memoryConfig;
    let context: Context | MemoryContext;

    if (useMemory) {
      context = new MemoryContext(prompt, memoryConfig);
      console.log("Memory storage:", memoryConfig.storage_path || "default");
    } else {
      context = new Context(prompt);
    }

    console.log("Model:", modelStringFromModel(prompt.model));
    console.log(`Chat session started. Type 'q' to quit, '?' to see context.`);

    if (useMemory) {
      console.log("Special memory commands:");
      console.log("  ?m - See stored memories");
      console.log("  ?reset - Reset memory for this session");
    }

    console.log(
      "To attach files, type 'file:' followed by the absolute path, e.g.:"
    );
    console.log("file:/path/to/document.pdf");

    while (true) {
      const response = await terminal.question(`${prompt.name}> `);

      if (response === "q") {
        break;
      } else if (response === "?") {
        // Display context info
        console.log(context);
      } else if (useMemory && response === "?m") {
        // Display memories (memory context only)
        const memories = (context as MemoryContext).getMemories();
        console.log("\nStored memories:");
        if (memories.length === 0) {
          console.log("No memories stored yet.");
        } else {
          memories.forEach((mem, i) => {
            console.log(
              `[${i + 1}] ${mem.memory} (${new Date(
                mem.created_at
              ).toLocaleString()})`
            );
          });
        }
        console.log();
      } else if (useMemory && response === "?reset") {
        // Reset memory (memory context only)
        (context as MemoryContext).resetMemory();
        console.log("Memory reset for this session.");
      } else {
        // Process regular input
        if (!response.startsWith("file:")) {
          console.log("You said:", response);
        } else {
          console.log(`Processing file: ${response.substring(5).trim()}`);
        }

        try {
          // Get the messages
          let messages = context.getMessages();

          // Add the user message
          if (useMemory) {
            context = await (context as MemoryContext).addUserMessage(response);
            // Enrich with memories if applicable
            context = await (
              context as MemoryContext
            ).enrichContextWithMemories();
          } else {
            context = await context.addUserMessage(response);
          }

          // Stream the response
          console.log("\nAssistant: ");
          const result = streamText({
            model: context.prompt.model,
            messages: context.getMessages(),
            tools: context.prompt.tools,
          });

          let fullResponse = "";
          for await (const delta of result.textStream) {
            fullResponse += delta;
            process.stdout.write(delta);
          }
          console.log(); // Add a new line after the response

          // Add the assistant response to the context
          context = await context.addAssistantResponse(fullResponse);

          if (useMemory) {
            context = await (context as MemoryContext).clearMessages();
          }
        } catch (error) {
          console.error("Error generating response:", error);
          if (!useMemory) process.exit(1); // Exit on error for non-memory chat
        }
      }
    }

    terminal.close();
    console.log("Chat session ended.");
  } catch (error) {
    console.error("Fatal error in chat:", error);
  }
}

// Legacy wrapper functions for backward compatibility
export async function chatWithPrompt(prompt: Prompt) {
  return interactiveChat(prompt);
}

export async function chatWithMemory(
  prompt: Prompt,
  memoryConfig?: Partial<MemoryConfig>
) {
  return interactiveChat(
    prompt,
    memoryConfig || {
      storage_path: path.join(os.homedir(), ".specialist", "memories"),
    }
  );
}

import { streamText } from "ai";
import { Context, makeContext, Prompt, addAttachmentToContext } from "./context.js";
import { CoreToolMessage } from "ai";
import readline from "node:readline/promises";
import { createAttachment } from "./attachments.js";
import fs from "fs-extra";
import path from "path";
import { MemoryConfig } from "./memory.js";
import { MemoryContext } from "./memory-context.js";

import { trackUsage } from "./usage.js";
import { modelStringFromModel } from "./models.js";

export async function generate(
  context: Context,
  message: string,
  log: boolean = true,
  maxSteps: number = 5
): Promise<Context> {
  // Check if the message contains a file path
  const newContext = { ...context, messages: [...context.messages] };
  
  if (message.startsWith("file:")) {
    const filePath = message.substring(5).trim();
    try {
      if (await fs.pathExists(filePath)) {
        const attachment = await createAttachment(filePath);
        return addAttachmentToContext(newContext, attachment);
      } else {
        console.error(`File not found: ${filePath}`);
        newContext.messages.push({ 
          role: "user", 
          content: `I tried to attach a file (${filePath}) but it wasn't found.` 
        });
        return newContext;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error processing file:", errorMessage);
      newContext.messages.push({ 
        role: "user", 
        content: `I tried to attach a file but there was an error: ${errorMessage}` 
      });
      return newContext;
    }
  } else {
    newContext.messages.push({ role: "user", content: message });
  }

  let runError: any;
  let usageData: any = null;
  const startTime = Date.now();

  const result = streamText({
    model: newContext.prompt.model,
    messages: newContext.messages,
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
        newContext.messages.push({ role: "assistant", content: text });
      } else if (finishReason == "tool-calls") {
        if (log) {
          console.log("tool_use", toolCalls, toolResults);
        }
        newContext.messages.push({
          role: "tool",
          content: toolResults,
        } as CoreToolMessage);
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
    operation: 'stream',
    promptTokens: usageData?.promptTokens,
    completionTokens: usageData?.completionTokens,
    totalTokens: usageData?.totalTokens,
    duration
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
  log: boolean = true,
  maxSteps: number = 5
): Promise<MemoryContext> {
  // Get the regular context from memory context
  const context = memoryContext.getContext();
  let newContext: Context;
  
  // Handle file attachment
  if (message.startsWith("file:")) {
    const filePath = message.substring(5).trim();
    try {
      if (await fs.pathExists(filePath)) {
        const attachment = await createAttachment(filePath);
        // Add attachment and get updated context
        newContext = addAttachmentToContext(context, attachment);
        // Add the file message to memory context
        await memoryContext.addUserMessage(`I'm sharing a file: ${path.basename(filePath)}`);
      } else {
        console.error(`File not found: ${filePath}`);
        // Add error message
        await memoryContext.addUserMessage(`I tried to attach a file (${filePath}) but it wasn't found.`);
        return memoryContext;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error processing file:", errorMessage);
      // Add error message
      await memoryContext.addUserMessage(`I tried to attach a file but there was an error: ${errorMessage}`);
      return memoryContext;
    }
  } else {
    // Add user message to memory context
    await memoryContext.addUserMessage(message);
    
    // Enrich context with relevant memories before generating response
    await memoryContext.enrichContextWithMemories();
    
    // Get the updated context
    newContext = memoryContext.getContext();
  }

  let runError: any;
  let usageData: any = null;
  const startTime = Date.now();
  
  const result = streamText({
    model: newContext.prompt.model,
    messages: newContext.messages,
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
        await memoryContext.addAssistantResponse(text);
      } else if (finishReason == "tool-calls") {
        if (log) {
          console.log("tool_use", toolCalls, toolResults);
        }
        newContext.messages.push({
          role: "tool",
          content: toolResults,
        } as CoreToolMessage);
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
    operation: 'stream-with-memory',
    promptTokens: usageData?.promptTokens,
    completionTokens: usageData?.completionTokens,
    totalTokens: usageData?.totalTokens,
    duration
  });

  return memoryContext;
}

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function chatWithPrompt(prompt: Prompt) {
  let context = makeContext(prompt);

  console.log("Chat session started. Type 'q' to quit, '?' to see context.");
  console.log("To attach files, type 'file:' followed by the absolute path, e.g.:");
  console.log("file:/path/to/document.pdf");

  while (true) {
    const response = await terminal.question(`${context.prompt.name}> `);
    if (response == "?") {
      console.log(context);
    } else if (response == "q") {
      break;
    } else {
      if (!response.startsWith("file:")) {
        console.log("You said:", response);
      } else {
        console.log(`Processing file: ${response.substring(5).trim()}`);
      }

      try {
        context = await generate(context, response);
      } catch (error) {
        console.error("Error", error);
        process.exit(1);
      }
    }
  }
}

export async function chatWithMemory(prompt: Prompt, memoryConfig?: Partial<MemoryConfig>) {
  console.log("Starting memory-enabled chat...");
  
  try {
    // Create memory-enabled context
    const memoryContext = new MemoryContext(prompt, memoryConfig);
    
    console.log("Memory context created successfully.");
    console.log("Model:", prompt.model.provider);
    console.log("Memory storage:", memoryConfig?.storage_path || "default");

    console.log("Memory-enabled chat session started. Type 'q' to quit.");
    console.log("Special commands:");
    console.log("  ? - See context");
    console.log("  ?m - See stored memories");
    console.log("  ?reset - Reset memory for this session");
    console.log("To attach files, type 'file:' followed by the absolute path, e.g.:");
    console.log("file:/path/to/document.pdf");

    // Make sure readline interface is set up correctly
    if (!terminal) {
      console.error("Terminal interface not initialized!");
      return;
    }

    // Check if we can read from stdin
    process.stdin.on('readable', () => {
      console.log('Stdin is readable');
    });

    while (true) {
      console.log(`Waiting for input... (${prompt.name})`);
      try {
        const response = await terminal.question(`${prompt.name}> `);
        console.log(`Got response: ${response}`);
        
        if (response === "?") {
          console.log(memoryContext.getContext());
        } else if (response === "?m") {
          const memories = memoryContext.getMemories();
          console.log("\nStored memories:");
          if (memories.length === 0) {
            console.log("No memories stored yet.");
          } else {
            memories.forEach((mem, i) => {
              console.log(`[${i+1}] ${mem.memory} (${new Date(mem.created_at).toLocaleString()})`);
            });
          }
          console.log(); // Empty line for clarity
        } else if (response === "?reset") {
          memoryContext.resetMemory();
          console.log("Memory reset for this session.");
        } else if (response === "q") {
          break;
        } else {
          if (!response.startsWith("file:")) {
            console.log("You said:", response);
          } else {
            console.log(`Processing file: ${response.substring(5).trim()}`);
          }

          try {
            console.log("Generating response with memory...");
            await generateWithMemory(memoryContext, response);
            console.log("Response generation complete.");
          } catch (error) {
            console.error("Error generating response:", error);
            // Don't exit on error, just continue the loop
          }
        }
      } catch (error) {
        console.error("Error handling input:", error);
      }
    }
    
    // Close the readline interface
    terminal.close();
    console.log("Chat session ended.");
  } catch (error) {
    console.error("Fatal error in chatWithMemory:", error);
  }
}

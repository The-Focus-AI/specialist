import { streamText } from "ai";
import { Context, makeContext, Prompt, addAttachmentToContext } from "./context.js";
import { CoreToolMessage } from "ai";
import readline from "node:readline/promises";
import { createAttachment } from "./attachments.js";
import fs from "fs-extra";
import path from "path";

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

  return newContext;
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

import { streamText } from "ai";
import { Context, makeContext, Prompt } from "./context.js";
import { CoreToolMessage } from "ai";
import readline from "node:readline/promises";

export async function generate(
  context: Context,
  message: string,
  log: boolean = true,
  maxSteps: number = 5
): Promise<Context> {
  context.messages.push({ role: "user", content: message });

  let runError: any;

  const result = streamText({
    model: context.prompt.model,
    messages: context.messages,
    tools: context.prompt.tools,
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
        context.messages.push({ role: "assistant", content: text });
      } else if (finishReason == "tool-calls") {
        if (log) {
          console.log("tool_use", toolCalls, toolResults);
        }
        context.messages.push({
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

  console.log("1");
  let fullResponse = "";
  if (log) {
    process.stdout.write("\nAssistant: ");
  }
  console.log("2");
  for await (const delta of result.textStream) {
    fullResponse += delta;
    if (log) {
      process.stdout.write(delta);
    }
  }

  if (runError) {
    throw runError;
  }

  return context;
}

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function chatWithPrompt(prompt: Prompt) {
  let context = makeContext(prompt);

  while (true) {
    const response = await terminal.question(`${context.prompt.name}> `);
    if (response == "?") {
      console.log(context);
    } else if (response == "q") {
      break;
    } else {
      console.log("You said:", response);

      try {
        context = await generate(context, response);
      } catch (error) {
        console.error("Error", error);
        process.exit(1);
      }
    }
  }
}

import { generateText, GenerateTextResult } from "ai";
import { Context } from "@/specialist/ai/context.js";

export async function complete(
  context: Context,
  prompt?: string
): Promise<GenerateTextResult<any, never>> {
  if (prompt) {
    context.messages.push({ role: "user", content: prompt });
  }
  const result = await generateText({
    model: context.prompt.model,
    messages: context.messages,
    tools: context.prompt.tools,
    maxSteps: 1,
  });
  // console.log("result", result);
  // console.log("complete", result);
  // process.exit(0);
  return result;
}

export function toolCallsFromResult<T>(
  toolName: string,
  result: GenerateTextResult<any, never>
): [T, any][] {
  const toolCalls: [T, any][] = result.toolResults
    .filter((message) => message.toolName === toolName)
    .map((message) => [message.args as T, message.result]);

  return toolCalls;
}

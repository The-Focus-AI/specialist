import { generateText, GenerateTextResult } from "ai";
import { Context } from "./context.js";
import { trackUsage } from "./usage.js";
import { modelStringFromModel } from "./models.js";

export async function complete(
  context: Context,
  prompt?: string
): Promise<GenerateTextResult<any, never>> {
  if (prompt) {
    context.messages.push({ role: "user", content: prompt });
  }
  
  const startTime = Date.now();
  const result = await generateText({
    model: context.prompt.model,
    messages: context.messages,
    tools: context.prompt.tools,
    maxSteps: 1,
  });
  const duration = Date.now() - startTime;

  // Update context usage stats
  if (result.usage) {
    context.usage.promptTokens += result.usage.promptTokens || 0;
    context.usage.completionTokens += result.usage.completionTokens || 0;
    context.usage.totalTokens += result.usage.totalTokens || 0;
    context.usage.calls += 1;
  }

  // Track global usage
  await trackUsage({
    timestamp: new Date().toISOString(),
    model: modelStringFromModel(context.prompt.model),
    operation: 'complete',
    promptTokens: result.usage?.promptTokens,
    completionTokens: result.usage?.completionTokens,
    totalTokens: result.usage?.totalTokens,
    duration
  });

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

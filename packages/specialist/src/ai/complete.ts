import { GenerateTextResult } from "ai";
import { Context } from "./context.js";

/**
 * Helper function to extract tool calls of a specific type from result
 */
export function toolCallsFromResult<T>(
  toolName: string,
  result: GenerateTextResult<any, never>
): [T, any][] {
  const toolCalls: [T, any][] = result.toolResults
    .filter((message) => message.toolName === toolName)
    .map((message) => [message.args as T, message.result]);

  return toolCalls;
}
import {
  CoreMessage,
  CoreSystemMessage,
  GenerateTextResult,
  LanguageModel,
  generateText,
} from "ai";
import { modelFromString } from "./models.js";

export interface Context {
  prompt: Prompt;
  messages: CoreMessage[];
}

export interface Prompt {
  name: string;
  system: string;
  prepopulated_questions: string[];
  tools: any;
  model: LanguageModel;
}

export function makeContext(prompt: Prompt): Context {
  const messages: CoreMessage[] = [];
  messages.push({
    id: "document-context",
    role: "system",
    content: prompt.system,
  } as CoreSystemMessage);

  return {
    prompt,
    messages,
  } as Context;
}

export function makePrompt(
  prompt: string,
  model: LanguageModel | string
): Prompt {
  let languageModel: LanguageModel;
  if (typeof model === "string") {
    languageModel = modelFromString(model);
  } else {
    languageModel = model;
  }
  return {
    name: "default",
    system: prompt,
    model: languageModel,
  } as Prompt;
}

export async function complete(
  context: Context
): Promise<GenerateTextResult<any, never>> {
  const result = await generateText({
    model: context.prompt.model,
    messages: context.messages,
    tools: context.prompt.tools,
    maxSteps: 1,
  });
  // console.log("complete", result);
  // process.exit(0);
  return result;
}

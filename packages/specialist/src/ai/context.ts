import {
  CoreMessage,
  CoreSystemMessage,
  GenerateTextResult,
  LanguageModel,
  generateText,
} from "ai";
import { modelFromString } from "./models.js";
import { Attachment, attachmentToContent } from "./attachments.js";

export interface UsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  calls: number;
}

export interface Context {
  prompt: Prompt;
  messages: CoreMessage[];
  usage: UsageStats;
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
    usage: {
      promptTokens: 0,
      completionTokens: 0, 
      totalTokens: 0,
      calls: 0
    }
  };
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
    prepopulated_questions: [],
    tools: undefined,
  } as Prompt;
}

export function addAttachmentToContext(
  context: Context,
  attachment: Attachment
): Context {
  // Create a deep copy of the context to avoid mutating the original
  const newContext = { 
    ...context, 
    messages: [...context.messages],
    usage: { ...context.usage }
  };

  // Add the attachment as a user message
  newContext.messages.push({
    role: "user",
    content: [
      {
        type: "text",
        text: `I've attached a file named ${attachment.filename} for you to analyze.`,
      },
      attachmentToContent(attachment),
    ],
  });

  return newContext;
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

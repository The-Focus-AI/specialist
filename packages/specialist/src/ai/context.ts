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

export interface Prompt {
  name: string;
  system: string;
  prepopulated_questions: string[];
  tools: any;
  model: LanguageModel;
}

export class Context {
  prompt: Prompt;
  protected _messages: CoreMessage[];
  usage: UsageStats;

  constructor(prompt: Prompt) {
    this.prompt = prompt;
    this._messages = [];
    this._messages.push({
      id: "document-context",
      role: "system",
      content: prompt.system,
    } as CoreSystemMessage);

    this.usage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      calls: 0,
    };
  }

  /**
   * Get all messages in the context
   */
  getMessages(): CoreMessage[] {
    return [...this._messages]; // Return a copy to prevent direct manipulation
  }

  /**
   * Get the system message content
   */
  getSystemMessage(): string {
    const systemMessage = this._messages[0];
    return systemMessage.content as string;
  }

  /**
   * Update the system message
   */
  async updateSystemMessage(content: string): Promise<Context> {
    const newContext = this.clone();
    if (newContext._messages[0].role === "system") {
      newContext._messages[0].content = content;
    }
    return newContext;
  }

  /**
   * Add an attachment to the context
   */
  async addAttachment(attachment: Attachment): Promise<Context> {
    // Create a new context instance to avoid mutation
    const newContext = this.clone();

    // Add the attachment as a user message
    newContext._messages.push({
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

  /**
   * Create a deep clone of this context
   */
  clone(): Context {
    const newContext = new Context(this.prompt);
    newContext._messages = [...this._messages];
    newContext.usage = { ...this.usage };
    return newContext;
  }

  /**
   * Add a user message to the context
   */
  async addUserMessage(message: string): Promise<Context> {
    const newContext = this.clone();
    newContext._messages.push({ role: "user", content: message });
    return newContext;
  }

  /**
   * Add a rich user message with multiple content parts (text, images, etc.)
   */
  async addRichUserMessage(contentParts: any[]): Promise<Context> {
    const newContext = this.clone();
    newContext._messages.push({ role: "user", content: contentParts });
    return newContext;
  }

  /**
   * Add an assistant response to the context
   */
  async addAssistantResponse(response: string): Promise<Context> {
    const newContext = this.clone();
    newContext._messages.push({ role: "assistant", content: response });
    return newContext;
  }

  /**
   * Add a tool message to the context
   */
  async addToolMessage(toolContent: any): Promise<Context> {
    const newContext = this.clone();
    newContext._messages.push({
      role: "tool",
      content: toolContent,
    });
    return newContext;
  }

  /**
   * Add an image to the context as a user message
   */
  async addImageMessage(
    base64Image: string,
    mimeType: string = "image/jpeg",
    altText: string = "Image"
  ): Promise<Context> {
    const newContext = this.clone();
    newContext._messages.push({
      role: "user",
      content: [
        { type: "text", text: `I'm sharing an image with you.` },
        { type: "image", image: base64Image, mimeType },
      ],
    });
    return newContext;
  }

  /**
   * Add a file to the context as a user message
   */
  async addFileMessage(
    base64Data: string,
    mimeType: string,
    filename: string
  ): Promise<Context> {
    const newContext = this.clone();
    newContext._messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `I've attached a file named ${filename} for you to analyze.`,
        },
        { type: "file", data: base64Data, mimeType },
      ],
    });
    return newContext;
  }

  /**
   * Complete the current context by generating a response
   */
  async complete(): Promise<GenerateTextResult<any, never>> {
    return await generateText({
      model: this.prompt.model,
      messages: this._messages,
      tools: this.prompt.tools,
      maxSteps: 1,
    });
  }
}

/**
 * Create a new context from a prompt
 * For backward compatibility
 */
export function makeContext(prompt: Prompt): Context {
  return new Context(prompt);
}

/**
 * Create a new prompt
 */
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

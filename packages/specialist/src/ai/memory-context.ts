import { CoreMessage } from "ai";
import { Context, Prompt } from "./context.js";
import { Memory, MemoryConfig, MemoryItem } from "./memory.js";
import path from "path";
import os from "os";
import { modelStringFromModel } from "./models.js";

/**
 * Memory-enabled context that maintains conversation history and extracts facts
 */
export class MemoryContext extends Context {
  private memory: Memory;
  private sessionId: string;

  /**
   * Create a new memory-enabled context
   * @param prompt The prompt to use
   * @param config Optional memory configuration
   */
  constructor(prompt: Prompt, config?: Partial<MemoryConfig>) {
    super(prompt);
    this.sessionId = Date.now().toString();

    // Default config uses home directory
    const defaultConfig: MemoryConfig = {
      storage_path: path.join(os.homedir(), ".specialist", "memories"),
      llm_model: modelStringFromModel(prompt.model),
    };

    this.memory = new Memory({ ...defaultConfig, ...config });
  }

  /**
   * Override to add message to context and update memory
   * @param message New user message
   */
  async addUserMessage(message: string): Promise<Context> {
    // Use parent class method to add to messages
    const newContext = await super.addUserMessage(message);

    // Update memory with all messages
    await this.memory.add(newContext.getMessages(), this.sessionId);

    return newContext;
  }

  /**
   * Add a rich user message with multiple content parts and update memory
   */
  async addRichUserMessage(contentParts: any[]): Promise<Context> {
    // Use parent class method to add to messages
    const newContext = await super.addRichUserMessage(contentParts);

    // Update memory with all messages
    await this.memory.add(newContext.getMessages(), this.sessionId);

    return newContext;
  }

  /**
   * Override to add assistant response to context and update memory
   * @param response Assistant's response
   */
  async addAssistantResponse(response: string): Promise<Context> {
    // Use parent class method to add to messages
    const newContext = await super.addAssistantResponse(response);

    // Update memory with new message
    await this.memory.add(
      [{ role: "assistant", content: response }],
      this.sessionId
    );

    return newContext;
  }

  /**
   * Override to add a tool message and update memory if needed
   */
  async addToolMessage(toolContent: any): Promise<Context> {
    // Use parent class method to add to messages
    const newContext = await super.addToolMessage(toolContent);

    // Tool messages generally aren't added to memory, but we could if needed

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
    // Use parent class method to add to messages
    const newContext = await super.addImageMessage(
      base64Image,
      mimeType,
      altText
    );

    // Update memory - we just add the fact that user shared an image
    await this.memory.add(
      [{ role: "user", content: `Shared an image with me. ${altText}` }],
      this.sessionId
    );

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
    // Use parent class method to add to messages
    const newContext = await super.addFileMessage(
      base64Data,
      mimeType,
      filename
    );

    // Update memory - we just add the fact that user shared a file
    await this.memory.add(
      [{ role: "user", content: `Shared a file with me: ${filename}` }],
      this.sessionId
    );

    return newContext;
  }

  /**
   * Override to add an attachment and update memory
   */
  async addAttachment(attachment: any): Promise<Context> {
    // Use parent class method to add to messages
    const newContext = await super.addAttachment(attachment);

    // Update memory
    await this.memory.add(
      [
        {
          role: "user",
          content: `Shared a file with me: ${attachment.filename}`,
        },
      ],
      this.sessionId
    );

    return newContext;
  }

  /**
   * Search memory for relevant information
   * @param query Search query
   * @param limit Maximum number of results
   */
  async searchMemory(query: string, limit: number = 5): Promise<MemoryItem[]> {
    return this.memory.search(query, this.sessionId, limit);
  }

  /**
   * Add relevant memories to the system message
   * This enriches the context with previously learned information
   * @param query Optional search query to filter memories
   */
  async enrichContextWithMemories(query?: string): Promise<Context> {
    // Get relevant memories
    const memories = await (query
      ? this.memory.search(query, this.sessionId)
      : Promise.resolve(this.memory.getAll(this.sessionId)));

    if (memories.length === 0) {
      return this;
    }

    // Format memories for inclusion in context
    const memoryText = memories.map((mem) => `- ${mem.memory}`).join("\n");

    // Create a new system message that includes memories
    const originalSystem = this.getSystemMessage();
    const enhancedSystem = `${originalSystem}\n\nI know the following about the user:\n${memoryText}\n\nUse this information to provide more personalized responses, but don't explicitly reference that you have this memory unless directly relevant to the conversation.`;

    // Update the system message
    return await this.updateSystemMessage(enhancedSystem);
  }

  /**
   * Reset the memory for this session
   */
  resetMemory(): void {
    // We don't reset all memories, just create a new session ID
    // Add 1 second to ensure it's different from the current timestamp
    this.sessionId = (Date.now() + 1000).toString();
  }

  /**
   * Clear the messages from the context
   */
  async clearMessages(): Promise<Context> {
    // Keep only the system message
    this._messages = [this._messages[0]];
    return this;
  }

  /**
   * Get all memories for the current session
   */
  getMemories(): MemoryItem[] {
    return this.memory.getAll(this.sessionId);
  }

  /**
   * Override clone to ensure memory context is properly copied
   */
  clone(): Context {
    const newContext = new MemoryContext(this.prompt);
    // Use getMessages to access the private _messages field
    const messages = this.getMessages();
    for (let i = 1; i < messages.length; i++) {
      // Skip system message which is added in constructor
      (newContext as any)._messages.push(messages[i]);
    }
    newContext.usage = { ...this.usage };
    (newContext as any).sessionId = this.sessionId;
    // Memory is intentionally shared between instances
    (newContext as any).memory = this.memory;
    return newContext;
  }
}

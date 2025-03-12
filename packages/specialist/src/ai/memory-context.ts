import { CoreMessage } from "ai";
import { Context, Prompt, makeContext } from "./context.js";
import { Memory, MemoryConfig, MemoryItem } from "./memory.js";
import path from "path";
import os from "os";
import { modelStringFromModel } from "./models.js";
/**
 * Memory-enabled context that maintains conversation history and extracts facts
 */
export class MemoryContext {
  private memory: Memory;
  private context: Context;
  private sessionId: string;

  /**
   * Create a new memory-enabled context
   * @param prompt The prompt to use
   * @param config Optional memory configuration
   */
  constructor(prompt: Prompt, config?: Partial<MemoryConfig>) {
    this.context = makeContext(prompt);
    this.sessionId = Date.now().toString();

    // Default config uses home directory
    const defaultConfig: MemoryConfig = {
      storage_path: path.join(os.homedir(), ".specialist", "memories"),
      llm_model: modelStringFromModel(prompt.model),
    };

    this.memory = new Memory({ ...defaultConfig, ...config });
  }

  /**
   * Get the current context
   */
  getContext(): Context {
    return this.context;
  }

  /**
   * Update the context with a new message and update memory
   * @param message New user message
   */
  async addUserMessage(message: string): Promise<Context> {
    // Add message to context
    this.context.messages.push({ role: "user", content: message });

    // Update memory with all messages so far
    await this.memory.add(this.context.messages, this.sessionId);

    return this.context;
  }

  /**
   * Add assistant response to context and update memory
   * @param response Assistant's response
   */
  async addAssistantResponse(response: string): Promise<Context> {
    // Add response to context
    this.context.messages.push({ role: "assistant", content: response });

    // Update memory with new message
    await this.memory.add(
      [{ role: "assistant", content: response }],
      this.sessionId
    );

    return this.context;
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
    const memories = query
      ? this.memory.search(query, this.sessionId)
      : this.memory.getAll(this.sessionId);

    if (memories.length === 0) {
      return this.context;
    }

    // Format memories for inclusion in context
    const memoryText = memories.map((mem) => `- ${mem.memory}`).join("\n");

    // Create a new system message that includes memories
    const originalSystem = this.context.messages[0].content as string;
    const enhancedSystem = `${originalSystem}\n\nI know the following about the user:\n${memoryText}\n\nUse this information to provide more personalized responses, but don't explicitly reference that you have this memory unless directly relevant to the conversation.`;

    // Update the system message
    this.context.messages[0].content = enhancedSystem;

    return this.context;
  }

  /**
   * Reset the memory for this session
   */
  resetMemory(): void {
    // We don't reset all memories, just create a new session ID
    this.sessionId = Date.now().toString();
  }

  /**
   * Get all memories for the current session
   */
  getMemories(): MemoryItem[] {
    return this.memory.getAll(this.sessionId);
  }
}

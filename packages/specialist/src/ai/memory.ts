import { CoreMessage } from "ai";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { ExtractFactsSpecialist } from "./memory/extractFactsSpecialist.js";
import { DetermineOperationsSpecialist } from "./memory/determineOperationsSpecialist.js";

// Memory item interface
export interface MemoryItem {
  id: string;
  memory: string;
  hash: string;
  created_at: string;
  updated_at: string;
  score?: number;
  user_id?: string;
  agent_id?: string;
  run_id?: string;
}

// Memory operation result
export interface MemoryOperationResult {
  results: Array<{
    id: string;
    memory: string;
    event: "ADD" | "UPDATE" | "DELETE" | "NONE";
    previous_memory?: string;
  }>;
  relations?: any[];
}

// Memory configuration
export interface MemoryConfig {
  // Storage options
  storage_path: string;

  // LLM configuration
  llm_model: string;

  // Optional settings
  custom_prompt?: string;
  version?: string;
}

/**
 * Memory system for persisting factual information from conversations
 */
export class Memory {
  private config: MemoryConfig;
  private memoryStoragePath: string;
  public memories: Map<string, MemoryItem> = new Map();
  private factExtractor: ExtractFactsSpecialist;
  private operationDeterminer: DetermineOperationsSpecialist;

  /**
   * Create a new Memory instance
   * @param config The memory configuration
   */
  constructor(config: Partial<MemoryConfig>) {
    this.config = {
      storage_path: "./memories",
      llm_model: "ollama/qwen2.5",
      version: "v1",
      ...config,
    };

    // Ensure storage directory exists
    this.memoryStoragePath = path.resolve(this.config.storage_path);
    fs.ensureDirSync(this.memoryStoragePath);

    // Initialize specialists
    this.factExtractor = new ExtractFactsSpecialist({
      llm_model: this.config.llm_model,
    });

    this.operationDeterminer = new DetermineOperationsSpecialist({
      llm_model: this.config.llm_model,
    });

    // Load existing memories
    this.loadMemories();
  }

  /**
   * Load memories from storage
   */
  private loadMemories(): void {
    try {
      const memoryFile = path.join(this.memoryStoragePath, "memories.json");
      if (fs.existsSync(memoryFile)) {
        const data = fs.readJSONSync(memoryFile);
        if (Array.isArray(data)) {
          data.forEach((item: MemoryItem) => {
            this.memories.set(item.id, item);
          });
        }
      }
    } catch (error) {
      console.error("Error loading memories:", error);
    }
  }

  /**
   * Save memories to storage
   */
  private saveMemories(): void {
    try {
      const memoryFile = path.join(this.memoryStoragePath, "memories.json");
      // Ensure directory exists before writing
      fs.ensureDirSync(this.memoryStoragePath);
      fs.writeJSONSync(memoryFile, Array.from(this.memories.values()), {
        spaces: 2,
      });
    } catch (error) {
      console.error("Error saving memories:", error);
    }
  }

  /**
   * Generate a hash for a memory
   * @param text The memory content
   * @returns MD5 hash of the content
   */
  private generateHash(text: string): string {
    return crypto.createHash("md5").update(text).digest("hex");
  }

  /**
   * Generate a UUID for a new memory
   * @returns UUID string
   */
  private generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Add memories from conversation messages
   * @param messages The conversation messages
   * @param userId Optional user identifier
   * @returns Operation result
   */
  public async add(
    messages: CoreMessage[],
    userId?: string
  ): Promise<MemoryOperationResult> {
    try {
      // Extract facts from messages using specialist
      const facts = await this.factExtractor.extractFacts(messages);

      // Get existing memories for this user
      const existingMemories = this.getAll(userId);

      // Determine operations using specialist
      const operations = await this.operationDeterminer.determineOperations(
        facts,
        existingMemories
      );

      // Execute operations
      for (const op of operations.results) {
        const now = new Date().toISOString();

        switch (op.event) {
          case "ADD":
            this.memories.set(op.id, {
              id: op.id,
              memory: op.memory,
              hash: this.generateHash(op.memory),
              created_at: now,
              updated_at: now,
              user_id: userId,
            });
            break;

          case "UPDATE":
            if (op.id && this.memories.has(op.id)) {
              const existing = this.memories.get(op.id)!;
              this.memories.set(op.id, {
                ...existing,
                memory: op.memory,
                hash: this.generateHash(op.memory),
                updated_at: now,
              });
            }
            break;

          case "DELETE":
            if (op.id) {
              this.memories.delete(op.id);
            }
            break;
        }
      }

      // Save changes
      this.saveMemories();

      return operations;
    } catch (error) {
      console.error("Error adding memories:", error);
      return { results: [] };
    }
  }

  /**
   * Search for memories based on a query
   * @param query The search query
   * @param userId Optional user identifier
   * @param limit Maximum number of results
   * @returns Search results
   */
  public search(
    query: string,
    userId?: string,
    limit: number = 5
  ): MemoryItem[] {
    try {
      // Simple search implementation (in a real system, use vector similarity)
      const results = Array.from(this.memories.values())
        .filter((memory) => {
          // Filter by user ID if provided
          if (userId && memory.user_id !== userId) {
            return false;
          }

          // Basic text matching (this would be replaced with vector similarity)
          return memory.memory.toLowerCase().includes(query.toLowerCase());
        })
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error("Error searching memories:", error);
      return [];
    }
  }

  /**
   * Get a specific memory by ID
   * @param memoryId The memory ID
   * @returns The memory item or undefined
   */
  public get(memoryId: string): MemoryItem | undefined {
    return this.memories.get(memoryId);
  }

  /**
   * Get all memories
   * @param userId Optional user identifier
   * @param limit Maximum number of results
   * @returns Array of memory items
   */
  public getAll(userId?: string, limit: number = 100): MemoryItem[] {
    const results = Array.from(this.memories.values())
      .filter((memory) => {
        // Filter by user ID if provided
        if (userId && memory.user_id !== userId) {
          return false;
        }
        return true;
      })
      .slice(0, limit);

    return results;
  }

  /**
   * Delete a memory
   * @param memoryId The memory ID
   * @returns True if memory was deleted
   */
  public delete(memoryId: string): boolean {
    const result = this.memories.delete(memoryId);
    if (result) {
      this.saveMemories();
    }
    return result;
  }

  /**
   * Reset all memories
   */
  public reset(): void {
    this.memories.clear();
    this.saveMemories();
  }
}

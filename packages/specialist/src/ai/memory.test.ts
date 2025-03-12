import { describe, expect, test, beforeEach, afterEach } from "@jest/globals";
import { Memory, MemoryConfig } from "./memory.js";
import fs from "fs-extra";
import path from "path";
import os from "os";

describe("Memory API", () => {
  let memory: Memory;
  let testDir: string;

  beforeEach(() => {
    // Create a temporary directory for memory storage
    testDir = path.join(os.tmpdir(), `memory-test-${Date.now()}`);
    fs.ensureDirSync(testDir);

    // Create memories.json file
    fs.writeJSONSync(path.join(testDir, "memories.json"), []);

    // Create memory instance with test config
    const config: MemoryConfig = {
      storage_path: testDir,
      llm_model: "ollama/qwen2.5",
    };

    memory = new Memory(config);
  });

  afterEach(() => {
    // Clean up test directory
    fs.removeSync(testDir);
  });

  test("should initialize memory with empty state", () => {
    const memories = memory.getAll();
    expect(memories).toHaveLength(0);
  });

  test("should add and retrieve memories (mock)", async () => {
    // Set up fake specialists to avoid actual LLM calls
    const mockFactExtractor = {
      extractFacts: jest
        .fn()
        .mockResolvedValue(["Name is John", "Likes pizza"]),
    };

    const mockOperationDeterminer = {
      determineOperations: jest.fn().mockResolvedValue({
        results: [
          {
            id: "test-id-1",
            memory: "Name is John",
            event: "ADD",
          },
          {
            id: "test-id-2",
            memory: "Likes pizza",
            event: "ADD",
          },
        ],
      }),
    };

    memory.setSpecialists(
      mockFactExtractor as any,
      mockOperationDeterminer as any
    );

    // Add test messages
    const result = await memory.add([
      { role: "user", content: "Hi, my name is John" },
      { role: "assistant", content: "Nice to meet you John!" },
      { role: "user", content: "I like pizza" },
    ]);

    // Check result
    expect(result.results).toHaveLength(2);
    expect(mockFactExtractor.extractFacts).toHaveBeenCalled();
    expect(mockOperationDeterminer.determineOperations).toHaveBeenCalled();

    // Verify memories were stored
    const allMemories = memory.getAll();
    expect(allMemories).toHaveLength(2);
    expect(allMemories[0].memory).toContain("John");
    expect(allMemories[1].memory).toContain("pizza");

    // Test search
    const searchResults = memory.search("pizza");
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].memory).toContain("pizza");
  }, 15000);

  test("should update existing memory (mock)", async () => {
    // Set up fake specialists
    const mockFactExtractor = {
      extractFacts: jest
        .fn()
        .mockResolvedValueOnce(["Name is John"])
        .mockResolvedValueOnce(["Name is John Smith"]),
    };

    const mockOperationDeterminer = {
      determineOperations: jest
        .fn()
        // First operation - add
        .mockResolvedValueOnce({
          results: [
            {
              id: "test-id-1",
              memory: "Name is John",
              event: "ADD",
            },
          ],
        })
        // Second operation - update
        .mockResolvedValueOnce({
          results: [
            {
              id: "test-id-1",
              memory: "Name is John Smith",
              event: "UPDATE",
              previous_memory: "Name is John",
            },
          ],
        }),
    };

    memory.setSpecialists(
      mockFactExtractor as any,
      mockOperationDeterminer as any
    );

    // Add initial memory
    await memory.add([{ role: "user", content: "Hi, my name is John" }]);

    // Update memory
    const updateResult = await memory.add([
      { role: "user", content: "Actually, my full name is John Smith" },
    ]);

    // Check result
    expect(updateResult.results).toHaveLength(1);
    expect(updateResult.results[0].event).toBe("UPDATE");
    expect(updateResult.results[0].memory).toContain("John Smith");

    // Verify memory was updated
    const allMemories = memory.getAll();
    expect(allMemories).toHaveLength(1);
    expect(allMemories[0].memory).toContain("John Smith");
  }, 15000);

  test("should delete memory (mock)", async () => {
    // Set up fake specialists
    const mockFactExtractor = {
      extractFacts: jest
        .fn()
        .mockResolvedValueOnce(["Likes cheese pizza"])
        .mockResolvedValueOnce(["Dislikes cheese pizza"]),
    };

    const mockOperationDeterminer = {
      determineOperations: jest
        .fn()
        // First operation - add
        .mockResolvedValueOnce({
          results: [
            {
              id: "test-id-1",
              memory: "Likes cheese pizza",
              event: "ADD",
            },
          ],
        })
        // Second operation - delete
        .mockResolvedValueOnce({
          results: [
            {
              id: "test-id-1",
              memory: "Likes cheese pizza",
              event: "DELETE",
            },
          ],
        }),
    };

    memory.setSpecialists(
      mockFactExtractor as any,
      mockOperationDeterminer as any
    );

    // Add initial memory
    await memory.add([{ role: "user", content: "I love cheese pizza" }]);

    // Delete memory
    const deleteResult = await memory.add([
      { role: "user", content: "Actually, I hate cheese pizza" },
    ]);

    // Check result
    expect(deleteResult.results).toHaveLength(1);
    expect(deleteResult.results[0].event).toBe("DELETE");

    // Verify memory was deleted
    const allMemories = memory.getAll();
    expect(allMemories).toHaveLength(0);
  }, 15000);

  test("should reset all memories", async () => {
    // Set up fake specialists
    const mockFactExtractor = {
      extractFacts: jest
        .fn()
        .mockResolvedValue(["Name is John", "Likes pizza"]),
    };

    const mockOperationDeterminer = {
      determineOperations: jest.fn().mockResolvedValue({
        results: [
          {
            id: "test-id-1",
            memory: "Name is John",
            event: "ADD",
          },
          {
            id: "test-id-2",
            memory: "Likes pizza",
            event: "ADD",
          },
        ],
      }),
    };

    memory.setSpecialists(
      mockFactExtractor as any,
      mockOperationDeterminer as any
    );

    // Add test memories
    await memory.add([
      { role: "user", content: "Hi, my name is John" },
      { role: "user", content: "I like pizza" },
    ]);

    // Verify memories exist
    expect(memory.getAll()).toHaveLength(2);

    // Reset memories
    memory.reset();

    // Verify memories are gone
    expect(memory.getAll()).toHaveLength(0);
  }, 15000);
});

import {
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { Memory } from "../memory.js";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { CoreMessage } from "ai";

describe("Memory System Integration with Real Specialists", () => {
  let testDir: string;
  let memory: Memory;

  // Increase timeout for all tests in this suite
  jest.setTimeout(60000);

  beforeEach(() => {
    // Create temporary directory for memory storage
    testDir = path.join(os.tmpdir(), `memory-integration-test-${Date.now()}`);
    fs.ensureDirSync(testDir);
    fs.writeJSONSync(path.join(testDir, "memories.json"), []);

    // Create memory instance with ollama model
    memory = new Memory({
      storage_path: testDir,
      llm_model: "ollama/qwen2.5",
    });
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  test("should extract and store facts from conversation", async () => {
    // Add memories from a conversation
    const messages: CoreMessage[] = [
      { role: "user", content: "My name is John Smith" },
      { role: "assistant", content: "Nice to meet you, John!" },
      {
        role: "user",
        content: "I like pizza and want to travel to Italy someday",
      },
    ];

    // Call memory.add which will use both specialists
    const result = await memory.add(messages, "test-user");

    // Verify the result contains memory operations
    expect(result.results.length).toBeGreaterThan(0);

    // Verify memories were stored
    const storedMemories = memory.getAll("test-user");
    expect(storedMemories.length).toBeGreaterThan(0);

    // Check if at least one memory contains the name
    const hasName = storedMemories.some((mem) =>
      mem.memory.toLowerCase().includes("john")
    );

    // Check if at least one memory contains food preference or travel interest
    const hasPreference = storedMemories.some(
      (mem) =>
        mem.memory.toLowerCase().includes("pizza") ||
        mem.memory.toLowerCase().includes("italy")
    );

    expect(hasName || hasPreference).toBe(true);
  });

  test("should be able to search memories by query", async () => {
    // First add some memories
    await memory.add(
      [
        { role: "user", content: "I like to drink coffee in the morning" },
        {
          role: "assistant",
          content: "Coffee is a great way to start the day!",
        },
      ],
      "test-user"
    );

    // Search for coffee-related memories
    const coffeeMemories = memory.search("coffee", "test-user");

    // Should find at least one memory related to coffee
    expect(coffeeMemories.length).toBeGreaterThan(0);
    expect(coffeeMemories[0].memory.toLowerCase()).toContain("coffee");
  });

  test("should get and delete a memory by ID", async () => {
    // Add a memory
    await memory.add(
      [{ role: "user", content: "My favorite color is blue" }],
      "test-user"
    );

    // Get all memories
    const allMemories = memory.getAll("test-user");
    expect(allMemories.length).toBeGreaterThan(0);

    // Get a specific memory by ID
    const memoryId = allMemories[0].id;
    const specificMemory = memory.get(memoryId);
    expect(specificMemory).toBeDefined();
    expect(specificMemory!.id).toBe(memoryId);

    // Delete the memory
    const deleted = memory.delete(memoryId);
    expect(deleted).toBe(true);

    // Verify it's gone
    expect(memory.get(memoryId)).toBeUndefined();
  });
});

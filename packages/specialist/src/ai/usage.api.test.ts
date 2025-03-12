import { describe, expect, it, beforeAll, afterAll } from "@jest/globals";
import { Context, makePrompt, generate } from "../ai/index.js";
import { requiresEnv, saveTestResult } from "./test-utils.js";
import {
  trackUsage,
  getUsageStats,
  UsageData,
  getUsagePaths,
  setUsagePaths,
} from "./usage.js";
import fs from "fs-extra";
import path from "path";
import os from "os";

// This test requires API access and will be skipped unless RUN_API_TESTS=true
const runApiTests = process.env.RUN_API_TESTS === "true";

// Use a temporary file for testing
const TEST_DIR = path.join(os.tmpdir(), "specialist-test-usage");
const USAGE_FILE = path.join(TEST_DIR, "usage.json");

describe("Usage tracking", () => {
  // Save original paths
  let originalPaths: { dir: string; file: string };

  beforeAll(async () => {
    // Save original path config
    originalPaths = getUsagePaths();
    
    // Create test directory
    await fs.ensureDir(TEST_DIR);
    
    // Set test paths
    setUsagePaths(TEST_DIR, USAGE_FILE);
  });

  afterAll(async () => {
    // Restore original paths
    setUsagePaths(originalPaths.dir, originalPaths.file);
    
    // Remove test directory
    await fs.remove(TEST_DIR);
  });

  it("should track usage events properly", async () => {
    // Clear any existing data
    await fs.writeFile(USAGE_FILE, "[]", "utf-8");
    
    // Track a usage event
    await trackUsage({
      timestamp: new Date().toISOString(),
      model: "test-model",
      operation: "complete",
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      duration: 100
    });
    
    // Get usage stats
    const stats = await getUsageStats();
    
    // Verify stats
    expect(stats.totalCalls).toBe(1);
    expect(stats.totalTokens).toBe(30);
    expect(stats.totalCompletionTokens).toBe(20);
    expect(stats.totalPromptTokens).toBe(10);
    
    // Verify model breakdown
    expect(stats.callsByModel["test-model"]).toBe(1);
    expect(stats.tokensByModel["test-model"]).toBe(30);
    
    // Verify operation breakdown
    expect(stats.callsByOperation["complete"]).toBe(1);
  });

  it("should handle malformed JSON gracefully", async () => {
    // Create a malformed JSON file
    await fs.writeFile(USAGE_FILE, "{bad-json", "utf-8");
    
    // This should not throw
    const stats = await getUsageStats();
    
    // Should have empty stats
    expect(stats.totalCalls).toBe(0);
  });

  it("should initialize empty file if not exists", async () => {
    // Remove the file
    await fs.remove(USAGE_FILE);
    
    // This should create a new file
    await trackUsage({
      timestamp: new Date().toISOString(),
      model: "test-model-2",
      operation: "complete",
      promptTokens: 5,
      completionTokens: 10,
      totalTokens: 15,
      duration: 50
    });
    
    // File should exist now
    expect(await fs.pathExists(USAGE_FILE)).toBe(true);
    
    // Check stats
    const stats = await getUsageStats();
    expect(stats.totalCalls).toBe(1);
    expect(stats.callsByModel["test-model-2"]).toBe(1);
  });
});
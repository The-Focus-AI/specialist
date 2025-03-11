import { describe, expect, it, beforeEach, afterEach } from "@jest/globals";
import { trackUsage, getUsageStats, UsageData, getUsagePaths, setUsagePaths } from "./usage.js";
import fs from "fs-extra";
import path from "path";
import os from "os";

describe("Usage Tracking", () => {
  // Temp directory for usage data during tests
  const TEMP_DIR = path.join(os.tmpdir(), `specialist-test-${Date.now()}`);
  const TEST_USAGE_FILE = path.join(TEMP_DIR, "usage.json");
  
  // Track original paths to restore after tests
  let originalPaths: { dir: string; file: string };
  
  beforeEach(async () => {
    // Store original values
    originalPaths = getUsagePaths();
    
    // Set temp location for tests
    setUsagePaths(TEMP_DIR, TEST_USAGE_FILE);
    
    // Create temp directory
    await fs.ensureDir(TEMP_DIR);
    // Start with empty usage file
    await fs.writeFile(TEST_USAGE_FILE, "[]", "utf-8");
  });
  
  afterEach(async () => {
    // Restore original values
    setUsagePaths(originalPaths.dir, originalPaths.file);
    
    // Clean up test directory
    try {
      await fs.remove(TEMP_DIR);
    } catch (error) {
      console.warn("Failed to clean up test directory:", error);
    }
  });
  
  it("should track usage data correctly", async () => {
    // Create mock usage data
    const mockData: UsageData = {
      timestamp: new Date().toISOString(),
      model: "test/model",
      operation: "complete",
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      duration: 500
    };
    
    // Track the mock data
    await trackUsage(mockData);
    
    // Read the file directly to verify
    const content = await fs.readFile(TEST_USAGE_FILE, "utf-8");
    const data = JSON.parse(content);
    
    // Verify the file contains our data
    expect(data).toHaveLength(1);
    expect(data[0].model).toBe("test/model");
    expect(data[0].operation).toBe("complete");
    expect(data[0].totalTokens).toBe(30);
    expect(data[0].duration).toBe(500);
  });
  
  it("should append multiple usage records", async () => {
    // Create multiple mock usage entries
    const mockData1: UsageData = {
      timestamp: new Date().toISOString(),
      model: "test/model1",
      operation: "complete",
      totalTokens: 30
    };
    
    const mockData2: UsageData = {
      timestamp: new Date().toISOString(),
      model: "test/model2",
      operation: "stream",
      totalTokens: 50
    };
    
    // Track both entries
    await trackUsage(mockData1);
    await trackUsage(mockData2);
    
    // Get the stats
    const stats = await getUsageStats();
    
    // Verify the stats reflect both entries
    expect(stats.totalCalls).toBe(2);
    expect(stats.totalTokens).toBe(80);
    expect(stats.callsByModel["test/model1"]).toBe(1);
    expect(stats.callsByModel["test/model2"]).toBe(1);
    expect(stats.tokensByModel["test/model1"]).toBe(30);
    expect(stats.tokensByModel["test/model2"]).toBe(50);
    expect(stats.callsByOperation["complete"]).toBe(1);
    expect(stats.callsByOperation["stream"]).toBe(1);
  });
  
  it("should handle missing token counts", async () => {
    // Create mock data without token counts
    const mockData: UsageData = {
      timestamp: new Date().toISOString(),
      model: "test/model",
      operation: "complete",
      duration: 500
      // No token counts
    };
    
    // Track the mock data
    await trackUsage(mockData);
    
    // Get the stats
    const stats = await getUsageStats();
    
    // Verify the stats count the call but not tokens
    expect(stats.totalCalls).toBe(1);
    expect(stats.totalTokens).toBe(0);
    expect(stats.callsByModel["test/model"]).toBe(1);
    expect(stats.tokensByModel["test/model"]).toBeUndefined();
  });
  
  it("should return empty stats when no data exists", async () => {
    // Ensure no file exists
    await fs.remove(TEST_USAGE_FILE);
    
    // Get the stats
    const stats = await getUsageStats();
    
    // Verify the stats are empty
    expect(stats.totalCalls).toBe(0);
    expect(stats.totalTokens).toBe(0);
    expect(Object.keys(stats.callsByModel)).toHaveLength(0);
    expect(Object.keys(stats.tokensByModel)).toHaveLength(0);
    expect(Object.keys(stats.callsByOperation)).toHaveLength(0);
  });
  
  it("should handle file system errors gracefully", async () => {
    // Create mock data
    const mockData: UsageData = {
      timestamp: new Date().toISOString(),
      model: "test/model",
      operation: "complete",
      totalTokens: 30
    };
    
    // Set non-existent path to simulate error
    setUsagePaths("/path", "/path/usage.json");
    
    // This should not throw an error despite file system issues
    await expect(trackUsage(mockData)).resolves.not.toThrow();
    
    // Reset paths
    setUsagePaths(TEMP_DIR, TEST_USAGE_FILE);
  });
});
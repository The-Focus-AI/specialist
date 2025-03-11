import { describe, expect, it, beforeAll, afterAll } from "@jest/globals";
import { complete, makeContext, makePrompt, generate } from "../ai/index.js";
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

// Skip all tests in this file if RUN_API_TESTS is not set
(runApiTests ? describe : describe.skip)("Usage Tracking API Tests", () => {
  // Temp directory for usage data during tests
  const TEMP_DIR = path.join(os.tmpdir(), `specialist-test-${Date.now()}`);
  const USAGE_FILE = path.join(TEMP_DIR, "usage.json");

  // Track original paths to restore after tests
  let originalUsageDir: string;
  let originalUsageFile: string;

  // Check for API keys
  let hasOpenAIKey = false;
  let hasAnthropicKey = false;
  let hasMistralKey = false;

  beforeAll(async () => {
    // Store original paths
    const paths = getUsagePaths();
    originalUsageDir = paths.dir;
    originalUsageFile = paths.file;

    // Set temp location for tests
    setUsagePaths(TEMP_DIR, USAGE_FILE);

    // Create temp directory
    await fs.ensureDir(TEMP_DIR);

    // Check for API keys
    hasOpenAIKey = await requiresEnv(
      "OPENAI_API_KEY",
      "op://Development/OpenAI Key/notesPlain"
    );
    hasAnthropicKey = await requiresEnv(
      "ANTHROPIC_API_KEY",
      "op://Development/Claude API/notesPlain"
    );
    hasMistralKey = await requiresEnv(
      "MISTRAL_API_KEY",
      "op://Development/Mistral API/notesPlain"
    );

    if (!hasOpenAIKey)
      console.log("OPENAI_API_KEY not available - some tests will be skipped");
    if (!hasAnthropicKey)
      console.log(
        "ANTHROPIC_API_KEY not available - some tests will be skipped"
      );
    if (!hasMistralKey)
      console.log("MISTRAL_API_KEY not available - some tests will be skipped");
  });

  afterAll(async () => {
    // Restore original values
    setUsagePaths(originalUsageDir, originalUsageFile);

    // Clean up test directory
    try {
      await fs.remove(TEMP_DIR);
    } catch (error) {
      console.warn("Failed to clean up test directory:", error);
    }
  });

  it("should track usage data structure correctly", async () => {
    // Create mock usage data
    const mockData: UsageData = {
      timestamp: new Date().toISOString(),
      model: "test/model",
      operation: "complete",
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      duration: 500,
    };

    // Track the mock data
    await trackUsage(mockData);

    // Get the updated stats
    const stats = await getUsageStats();

    // Verify the stats reflect our mock data
    expect(stats.totalCalls).toBe(1);
    expect(stats.totalTokens).toBe(30);
    expect(stats.tokensByModel["test/model"]).toBe(30);
    expect(stats.callsByModel["test/model"]).toBe(1);
    expect(stats.callsByOperation["complete"]).toBe(1);
  });

  it("should track OpenAI API usage correctly and update context usage", async () => {
    // Skip if API key is missing
    if (!hasOpenAIKey) {
      return;
    }

    // Clear existing usage data
    await fs.writeFile(USAGE_FILE, "[]", "utf-8");

    // Create a context with OpenAI model
    const prompt = makePrompt(
      "Write a brief haiku about coding",
      "openai/gpt-4o"
    );
    const context = makeContext(prompt);
    
    // Verify initial usage is zero
    expect(context.usage.promptTokens).toBe(0);
    expect(context.usage.completionTokens).toBe(0);
    expect(context.usage.totalTokens).toBe(0);
    expect(context.usage.calls).toBe(0);

    // Call the API
    const result = await complete(context);

    // Verify we got a meaningful response
    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(10);
    
    // Verify context usage has been updated
    expect(context.usage.promptTokens).toBeGreaterThan(0);
    expect(context.usage.completionTokens).toBeGreaterThan(1); // Ensure more than 1 completion token
    console.log(`OpenAI write tokens: ${context.usage.completionTokens}`);
    expect(context.usage.totalTokens).toBeGreaterThan(0);
    expect(context.usage.calls).toBe(1);

    // Get usage stats and verify tracking
    const stats = await getUsageStats();

    // Basic validation
    expect(stats.totalCalls).toBe(1);
    expect(stats.totalTokens).toBeGreaterThan(0);
    expect(stats.callsByModel["openai/gpt-4o"]).toBe(1);
    expect(stats.callsByOperation["complete"]).toBe(1);

    // Detailed validation of tokens
    expect(stats.tokensByModel["openai/gpt-4o"]).toBeDefined();
    expect(stats.tokensByModel["openai/gpt-4o"]).toBeGreaterThan(0);

    // Save the result for future reference
    saveTestResult("openai_usage_tracking", {
      prompt: "Write a brief haiku about coding",
      model: "openai/gpt-4o",
      result: result.text,
      usage: {
        totalCalls: stats.totalCalls,
        totalTokens: stats.totalTokens,
        totalPromptTokens: stats.totalPromptTokens,
        totalCompletionTokens: stats.totalCompletionTokens,
        tokensByModel: stats.tokensByModel,
        promptTokensByModel: stats.promptTokensByModel,
        completionTokensByModel: stats.completionTokensByModel,
        contextUsage: {
          promptTokens: context.usage.promptTokens,
          completionTokens: context.usage.completionTokens,
          totalTokens: context.usage.totalTokens,
          calls: context.usage.calls
        }
      },
    });
  }, 60000);

  it("should track Anthropic API usage correctly and update context usage", async () => {
    // Skip if API key is missing
    if (!hasAnthropicKey) {
      return;
    }

    // Clear existing usage data
    await fs.writeFile(USAGE_FILE, "[]", "utf-8");

    // Create a context with Anthropic model
    const prompt = makePrompt(
      "Write a brief haiku about AI",
      "anthropic/claude-3-haiku-20240307"
    );
    const context = makeContext(prompt);
    context.messages.push({
      role: "user",
      content: "Write a brief haiku about AI",
    });
    
    // Verify initial usage is zero
    expect(context.usage.promptTokens).toBe(0);
    expect(context.usage.completionTokens).toBe(0);
    expect(context.usage.totalTokens).toBe(0);
    expect(context.usage.calls).toBe(0);

    // Call the API
    const result = await complete(context);

    // Verify we got a meaningful response
    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(10);
    
    // Verify context usage has been updated
    expect(context.usage.promptTokens).toBeGreaterThan(0);
    expect(context.usage.completionTokens).toBeGreaterThan(1); // Ensure more than 1 completion token
    console.log(`Claude write tokens: ${context.usage.completionTokens}`);
    expect(context.usage.totalTokens).toBeGreaterThan(0);
    expect(context.usage.calls).toBe(1);

    // Get usage stats and verify tracking
    const stats = await getUsageStats();

    // Basic validation
    expect(stats.totalCalls).toBe(1);
    expect(stats.totalTokens).toBeGreaterThan(0);
    expect(stats.callsByModel["anthropic/claude-3-haiku-20240307"]).toBe(1);
    expect(stats.callsByOperation["complete"]).toBe(1);

    // Detailed validation of tokens
    expect(
      stats.tokensByModel["anthropic/claude-3-haiku-20240307"]
    ).toBeDefined();
    expect(
      stats.tokensByModel["anthropic/claude-3-haiku-20240307"]
    ).toBeGreaterThan(0);

    // Save the result for future reference
    saveTestResult("anthropic_usage_tracking", {
      prompt: "Write a brief haiku about AI",
      model: "anthropic/claude-3-haiku-20240307",
      result: result.text,
      usage: {
        totalCalls: stats.totalCalls,
        totalTokens: stats.totalTokens,
        totalPromptTokens: stats.totalPromptTokens,
        totalCompletionTokens: stats.totalCompletionTokens,
        tokensByModel: stats.tokensByModel,
        promptTokensByModel: stats.promptTokensByModel,
        completionTokensByModel: stats.completionTokensByModel,
        contextUsage: {
          promptTokens: context.usage.promptTokens,
          completionTokens: context.usage.completionTokens,
          totalTokens: context.usage.totalTokens,
          calls: context.usage.calls
        }
      },
    });
  }, 60000);

  it("should track streaming usage correctly and update context usage", async () => {
    // Skip if API key is missing
    if (!hasOpenAIKey) {
      return;
    }

    // Clear existing usage data
    await fs.writeFile(USAGE_FILE, "[]", "utf-8");

    // Create a context with OpenAI model
    const prompt = makePrompt(
      "Write a brief poem about programming",
      "openai/gpt-4o"
    );
    const context = makeContext(prompt);
    
    // Verify initial usage is zero
    expect(context.usage.promptTokens).toBe(0);
    expect(context.usage.completionTokens).toBe(0);
    expect(context.usage.totalTokens).toBe(0);
    expect(context.usage.calls).toBe(0);

    // Call the API with streaming
    const updatedContext = await generate(
      context,
      "Tell me a short joke",
      false
    );
    
    // Verify context usage has been updated
    expect(updatedContext.usage.promptTokens).toBeGreaterThan(0);
    expect(updatedContext.usage.completionTokens).toBeGreaterThan(1); // Ensure more than 1 completion token
    console.log(`Streaming write tokens: ${updatedContext.usage.completionTokens}`);
    expect(updatedContext.usage.totalTokens).toBeGreaterThan(0);
    expect(updatedContext.usage.calls).toBe(1);

    // Get usage stats and verify tracking
    const stats = await getUsageStats();

    // Basic validation
    expect(stats.totalCalls).toBe(1);
    expect(stats.totalTokens).toBeGreaterThan(0);
    expect(stats.callsByModel["openai/gpt-4o"]).toBe(1);
    expect(stats.callsByOperation["stream"]).toBe(1);

    // Detailed validation of tokens
    expect(stats.tokensByModel["openai/gpt-4o"]).toBeDefined();
    expect(stats.tokensByModel["openai/gpt-4o"]).toBeGreaterThan(0);

    // Save the result for future reference
    saveTestResult("stream_usage_tracking", {
      prompt: "Tell me a short joke",
      model: "openai/gpt-4o",
      usage: {
        totalCalls: stats.totalCalls,
        totalTokens: stats.totalTokens,
        totalPromptTokens: stats.totalPromptTokens,
        totalCompletionTokens: stats.totalCompletionTokens,
        tokensByModel: stats.tokensByModel,
        promptTokensByModel: stats.promptTokensByModel,
        completionTokensByModel: stats.completionTokensByModel,
        contextUsage: {
          promptTokens: updatedContext.usage.promptTokens,
          completionTokens: updatedContext.usage.completionTokens,
          totalTokens: updatedContext.usage.totalTokens,
          calls: updatedContext.usage.calls
        }
      },
    });
  }, 60000);

  it("should track Mistral API usage correctly and update context usage", async () => {
    // Skip if API key is missing
    if (!hasMistralKey) {
      return;
    }

    // Clear existing usage data
    await fs.writeFile(USAGE_FILE, "[]", "utf-8");

    // Create a context with Mistral model (using OpenAI provider with custom base URL)
    const prompt = makePrompt(
      "Write a brief haiku about stars",
      "mistral/mistral-large-latest"
    );
    const context = makeContext(prompt);
    
    // Verify initial usage is zero
    expect(context.usage.promptTokens).toBe(0);
    expect(context.usage.completionTokens).toBe(0);
    expect(context.usage.totalTokens).toBe(0);
    expect(context.usage.calls).toBe(0);

    // Call the API
    const result = await complete(context);

    // Verify we got a meaningful response
    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(10);
    
    // Verify context usage has been updated
    expect(context.usage.promptTokens).toBeGreaterThan(0);
    expect(context.usage.completionTokens).toBeGreaterThan(1); // Ensure more than 1 completion token
    console.log(`Mistral write tokens: ${context.usage.completionTokens}`);
    expect(context.usage.totalTokens).toBeGreaterThan(0);
    expect(context.usage.calls).toBe(1);

    // Get usage stats and verify tracking
    const stats = await getUsageStats();

    // Basic validation
    expect(stats.totalCalls).toBe(1);
    expect(stats.totalTokens).toBeGreaterThan(0);
    expect(stats.callsByModel["mistral/mistral-large-latest"]).toBe(1);
    expect(stats.callsByOperation["complete"]).toBe(1);

    // Detailed validation of tokens
    expect(stats.tokensByModel["mistral/mistral-large-latest"]).toBeDefined();
    expect(stats.tokensByModel["mistral/mistral-large-latest"]).toBeGreaterThan(0);

    // Save the result for future reference
    saveTestResult("mistral_usage_tracking", {
      prompt: "Write a brief haiku about stars",
      model: "mistral/mistral-large-latest",
      result: result.text,
      usage: {
        totalCalls: stats.totalCalls,
        totalTokens: stats.totalTokens,
        totalPromptTokens: stats.totalPromptTokens,
        totalCompletionTokens: stats.totalCompletionTokens,
        tokensByModel: stats.tokensByModel,
        promptTokensByModel: stats.promptTokensByModel,
        completionTokensByModel: stats.completionTokensByModel,
        contextUsage: {
          promptTokens: context.usage.promptTokens,
          completionTokens: context.usage.completionTokens,
          totalTokens: context.usage.totalTokens,
          calls: context.usage.calls
        }
      },
    });
  }, 60000);
});

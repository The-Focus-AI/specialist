import fs from "fs-extra";
import path from "path";
import os from "os";

export interface UsageData {
  timestamp: string;
  model: string;
  operation: "complete" | "stream" | "generate";
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  duration?: number;
}

export interface UsageStats {
  totalCalls: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  tokensByModel: Record<string, number>;
  promptTokensByModel: Record<string, number>;
  completionTokensByModel: Record<string, number>;
  callsByModel: Record<string, number>;
  callsByOperation: Record<string, number>;
}

// Default paths
const DEFAULT_USAGE_DIR = path.join(os.homedir(), ".specialist");
const DEFAULT_USAGE_FILE = path.join(DEFAULT_USAGE_DIR, "usage.json");

// For testing: allow overriding the paths
let currentUsageDir = DEFAULT_USAGE_DIR;
let currentUsageFile = DEFAULT_USAGE_FILE;

// Getter/setter functions for testing
export function getUsagePaths() {
  return {
    dir: currentUsageDir,
    file: currentUsageFile,
  };
}

export function setUsagePaths(dir: string, file: string) {
  currentUsageDir = dir;
  currentUsageFile = file;
}

/**
 * Track usage of AI operations
 */
export async function trackUsage(data: UsageData): Promise<void> {
  try {
    const { dir, file } = getUsagePaths();
    await fs.ensureDir(dir);

    let usageLog: UsageData[] = [];

    if (await fs.pathExists(file)) {
      const content = await fs.readFile(file, "utf-8");
      usageLog = JSON.parse(content);
    }

    usageLog.push(data);

    await fs.writeFile(file, JSON.stringify(usageLog, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to track usage:", error);
    // Don't rethrow the error to handle file system errors gracefully
  }
}

/**
 * Get usage statistics
 */
export async function getUsageStats(): Promise<UsageStats> {
  try {
    const { file } = getUsagePaths();

    if (!(await fs.pathExists(file))) {
      return {
        totalCalls: 0,
        totalTokens: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        tokensByModel: {},
        promptTokensByModel: {},
        completionTokensByModel: {},
        callsByModel: {},
        callsByOperation: {},
      };
    }

    const content = await fs.readFile(file, "utf-8");
    const usageLog: UsageData[] = JSON.parse(content);

    const stats: UsageStats = {
      totalCalls: usageLog.length,
      totalTokens: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      tokensByModel: {},
      promptTokensByModel: {},
      completionTokensByModel: {},
      callsByModel: {},
      callsByOperation: {},
    };

    for (const entry of usageLog) {
      // Count total tokens if available
      if (entry.totalTokens) {
        stats.totalTokens += entry.totalTokens;

        if (!stats.tokensByModel[entry.model]) {
          stats.tokensByModel[entry.model] = 0;
        }
        stats.tokensByModel[entry.model] += entry.totalTokens;
      }
      
      // Count prompt tokens if available
      if (entry.promptTokens) {
        stats.totalPromptTokens += entry.promptTokens;
        
        if (!stats.promptTokensByModel[entry.model]) {
          stats.promptTokensByModel[entry.model] = 0;
        }
        stats.promptTokensByModel[entry.model] += entry.promptTokens;
      }
      
      // Count completion tokens if available
      if (entry.completionTokens) {
        stats.totalCompletionTokens += entry.completionTokens;
        
        if (!stats.completionTokensByModel[entry.model]) {
          stats.completionTokensByModel[entry.model] = 0;
        }
        stats.completionTokensByModel[entry.model] += entry.completionTokens;
      }

      // Count calls by model
      if (!stats.callsByModel[entry.model]) {
        stats.callsByModel[entry.model] = 0;
      }
      stats.callsByModel[entry.model]++;

      // Count calls by operation
      if (!stats.callsByOperation[entry.operation]) {
        stats.callsByOperation[entry.operation] = 0;
      }
      stats.callsByOperation[entry.operation]++;
    }

    return stats;
  } catch (error) {
    console.error("Failed to get usage stats:", error);
    return {
      totalCalls: 0,
      totalTokens: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      tokensByModel: {},
      promptTokensByModel: {},
      completionTokensByModel: {},
      callsByModel: {},
      callsByOperation: {},
    };
  }
}

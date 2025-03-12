import { command } from "cmd-ts";
import { getUsageStats } from "../ai/usage.js";

export const usageCommand = command({
  name: "usage",
  description: "Display AI usage statistics",
  args: {},
  handler: async () => {
    try {
      const stats = await getUsageStats();
      
      console.log("\nAI Usage Statistics\n");
      
      // Total usage
      console.log("Total Calls:", stats.totalCalls);
      console.log("Total Tokens:", stats.totalTokens);
      
      // Breakdown by model
      console.log("\nUsage by Model:");
      Object.entries(stats.callsByModel).forEach(([model, count]) => {
        const tokens = stats.tokensByModel[model] || 0;
        console.log(`  ${model}: ${count} calls, ${tokens} tokens`);
      });
      
      // Breakdown by operation
      console.log("\nUsage by Operation:");
      Object.entries(stats.callsByOperation).forEach(([op, count]) => {
        console.log(`  ${op}: ${count} calls`);
      });
      
      console.log(); // Empty line at the end
    } catch (error) {
      console.error("Failed to retrieve usage statistics:", error);
      process.exit(1);
    }
  }
});
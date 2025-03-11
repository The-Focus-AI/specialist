import { Command } from "commander";
import { getUsageStats } from "../ai/usage.js";
import chalk from "chalk";

export const usage = new Command()
  .name("usage")
  .description("Display AI usage statistics")
  .action(async () => {
    try {
      const stats = await getUsageStats();
      
      console.log(chalk.bold("\nAI Usage Statistics\n"));
      
      // Total usage
      console.log(chalk.cyan("Total Calls:"), stats.totalCalls);
      console.log(chalk.cyan("Total Tokens:"), stats.totalTokens);
      
      // Breakdown by model
      console.log(chalk.cyan("\nUsage by Model:"));
      Object.entries(stats.callsByModel).forEach(([model, count]) => {
        const tokens = stats.tokensByModel[model] || 0;
        console.log(`  ${chalk.yellow(model)}: ${count} calls, ${tokens} tokens`);
      });
      
      // Breakdown by operation
      console.log(chalk.cyan("\nUsage by Operation:"));
      Object.entries(stats.callsByOperation).forEach(([op, count]) => {
        console.log(`  ${chalk.yellow(op)}: ${count} calls`);
      });
      
      console.log(); // Empty line at the end
    } catch (error) {
      console.error("Failed to retrieve usage statistics:", error);
      process.exit(1);
    }
  });
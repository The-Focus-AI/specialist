import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";

/**
 * Utility function to ensure an environment variable is available,
 * optionally trying to fetch it from 1Password if not found
 * 
 * @param envVar The environment variable name to check
 * @param opItemPath Optional 1Password item path to fetch the key
 * @returns boolean indicating if the environment variable is available
 */
export async function requiresEnv(envVar: string, opItemPath?: string): Promise<boolean> {
  // Check if environment variable is already set
  if (process.env[envVar]) {
    return true;
  }
  
  // If no 1Password path provided, return false
  if (!opItemPath) {
    return false;
  }
  
  try {
    // Try to get API key from 1Password
    const cmd = `op read "${opItemPath}"`;
    const value = execSync(cmd).toString().trim();
    
    if (value) {
      process.env[envVar] = value;
      return true;
    }
  } catch (e) {
    // Failed to get from 1Password, return false
    return false;
  }
  
  return false;
}

/**
 * Ensure the test_output directory exists
 */
export function ensureTestOutputDir(): string {
  // Create test_output directory at repo root level
  const outputDir = path.resolve(process.cwd(), 'tests_output');
  fs.ensureDirSync(outputDir);
  return outputDir;
}

/**
 * Save API test result to a file
 */
export function saveTestResult(testName: string, result: any): void {
  const outputDir = ensureTestOutputDir();
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `${testName}_${timestamp}.json`;
  const outputPath = path.join(outputDir, filename);
  
  fs.writeJsonSync(outputPath, result, { spaces: 2 });
  console.log(`Test result saved to ${outputPath}`);
}
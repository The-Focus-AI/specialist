import path from "path";
import { createAttachment } from "./attachments.js";
import { Context } from "./context.js";
import fs from "fs/promises";
import { existsSync } from "fs";

export async function addFileToContext(
  context: Context,
  file: string
): Promise<Context> {
  if (file === "") {
    return context;
  }

  const filePath = path.resolve(file);

  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    // Create attachment from file
    const attachment = await createAttachment(filePath);
    // Add attachment to context
    return await context.addAttachment(attachment);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to process file ${filePath}: ${errorMessage}`);
  }
}

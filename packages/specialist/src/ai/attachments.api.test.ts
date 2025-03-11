import { describe, expect, it, beforeAll } from "@jest/globals";
import { createAttachment } from "./attachments.js";
import { addAttachmentToContext, complete, makeContext, makePrompt } from "./context.js";
import { requiresEnv, saveTestResult } from "./test-utils.js";
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This test requires API access and will be skipped unless RUN_API_TESTS=true
const runApiTests = process.env.RUN_API_TESTS === "true";

// Skip all tests in this file if RUN_API_TESTS is not set
(runApiTests ? describe : describe.skip)("Attachment API Tests", () => {
  const testDataDir = path.resolve(__dirname, "../../test_data");
  const imageFile = path.join(testDataDir, "internet_archive_fffound.png");
  
  // Check for test files and API keys
  let hasOpenAIKey = false;
  let hasTestFiles = false;
  
  beforeAll(async () => {
    // Check for test files
    hasTestFiles = fs.existsSync(imageFile);
    if (!hasTestFiles) {
      console.error(`Test file not found: ${imageFile}`);
    }
    
    // Check for API keys
    hasOpenAIKey = await requiresEnv("OPENAI_API_KEY", "op://Development/OpenAI Key/notesPlain");
    if (!hasOpenAIKey) {
      console.error("OPENAI_API_KEY not available - some tests will be skipped");
    }
  });
  
  it("should process an image with OpenAI API", async () => {
    // Skip if files or API key are missing
    if (!hasTestFiles || !hasOpenAIKey) {
      return;
    }
    
    const attachment = await createAttachment(imageFile);
    
    // Verify attachment was created correctly
    expect(attachment.filename).toBe("internet_archive_fffound.png");
    expect(attachment.mimeType).toBe("image/png");
    expect(attachment.base64Data).toBeDefined();
    
    // Create a context with OpenAI model
    const prompt = makePrompt("Describe what you see in this image in detail", "openai/gpt-4o");
    const context = makeContext(prompt);
    
    // Add the image to the context
    const updatedContext = addAttachmentToContext(context, attachment);
    
    // Call the API
    const result = await complete(updatedContext);
    
    // Verify we got a meaningful response
    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(100);
    
    // The image has certain recognizable elements we can test for
    expect(result.text.toLowerCase()).toContain("archive");
    
    // Save the result for future reference
    saveTestResult("openai_image_analysis", {
      prompt: "Describe what you see in this image in detail",
      model: "openai/gpt-4o",
      result: result.text
    });
  }, 60000); // Allow up to 60 seconds for this test
  
  it("should analyze image content with Anthropic API", async () => {
    // Skip if files are missing
    if (!hasTestFiles) {
      return;
    }
    
    // Check for Anthropic API key
    const hasAnthropicKey = await requiresEnv("ANTHROPIC_API_KEY", "op://Development/Claude Key/notesPlain");
    if (!hasAnthropicKey) {
      console.log("ANTHROPIC_API_KEY not available - skipping Anthropic image test");
      return;
    }
    
    const attachment = await createAttachment(imageFile);
    
    // Create a context with Anthropic model
    const prompt = makePrompt("What's in this image? Describe it in detail.", "anthropic/claude-3-opus-20240229");
    const context = makeContext(prompt);
    
    // Add the image to the context
    const updatedContext = addAttachmentToContext(context, attachment);
    
    // Call the API
    const result = await complete(updatedContext);
    
    // Verify we got a meaningful response
    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(100);
    
    // Save the result for future reference
    saveTestResult("anthropic_image_analysis", {
      prompt: "What's in this image? Describe it in detail.",
      model: "anthropic/claude-3-opus-20240229",
      result: result.text
    });
  }, 60000); // Allow up to 60 seconds for this test
});
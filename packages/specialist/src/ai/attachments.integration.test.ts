import { describe, expect, it, beforeAll } from '@jest/globals';
import { createAttachment } from './attachments.js';
import { Context, makePrompt } from './context.js';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// These tests check attachment integration with context but don't call the API
describe('Attachment Integration Tests', () => {
  const testDataDir = path.resolve(__dirname, '../../test_data');
  const imageFile = path.join(testDataDir, 'internet_archive_fffound.png');
  const pdfFile = path.join(
    testDataDir,
    'Home-Cooked Software and Barefoot Developers.pdf'
  );

  // Skip tests if test files don't exist
  const runTests = fs.existsSync(imageFile) && fs.existsSync(pdfFile);

  beforeAll(() => {
    // Log information about test files
    if (!runTests) {
      console.warn('Test files not found in test_data directory');
      console.log(' - Expected: ' + imageFile);
      console.log(' - Expected: ' + pdfFile);
      console.log('Attachment tests will be skipped');
    }
  });

  it('should process the PNG sample file from test_data directory', async () => {
    if (!runTests) {
      console.warn('Skipping test: test files not found');
      return;
    }

    const imageAttachment = await createAttachment(imageFile);

    expect(imageAttachment.filename).toBe('internet_archive_fffound.png');
    expect(imageAttachment.mimeType).toBe('image/png');
    expect(imageAttachment.base64Data).toBeDefined();

    // Create a basic context
    const imagePrompt = makePrompt('Analyze this image', 'ollama/llava:7b');
    const imageContext = new Context(imagePrompt);

    // Add the image to the context
    const imageUpdatedContext = await imageContext.addAttachment(imageAttachment);

    // Verify the context has the correct structure for models to process
    const imageMessages = imageUpdatedContext.getMessages();
    const imageUserMessage = imageMessages[1];
    expect(imageUserMessage.role).toBe('user');

    const imageContent = imageUserMessage.content as any[];
    expect(imageContent[0].type).toBe('text');
    expect(imageContent[1].type).toBe('image');
    expect(imageContent[1].image).toBeDefined();
    expect(imageContent[1].mimeType).toBe('image/png');
  });

  it('should process the PDF sample file from test_data directory', async () => {
    if (!runTests) {
      console.warn('Skipping test: test files not found');
      return;
    }

    const pdfAttachment = await createAttachment(pdfFile);

    expect(pdfAttachment.filename).toBe(
      'Home-Cooked Software and Barefoot Developers.pdf'
    );
    expect(pdfAttachment.mimeType).toBe('application/pdf');
    expect(pdfAttachment.base64Data).toBeDefined();

    // Create a basic context
    const pdfPrompt = makePrompt('Analyze this PDF', 'ollama/llama3.2');
    const pdfContext = new Context(pdfPrompt);

    // Add the PDF to the context
    const pdfUpdatedContext = await pdfContext.addAttachment(pdfAttachment);

    // Verify the context has the correct structure for models to process
    const pdfMessages = pdfUpdatedContext.getMessages();
    const pdfUserMessage = pdfMessages[1];
    expect(pdfUserMessage.role).toBe('user');

    const pdfContent = pdfUserMessage.content as any[];
    expect(pdfContent[0].type).toBe('text');
    expect(pdfContent[1].type).toBe('file');
    expect(pdfContent[1].mimeType).toBe('application/pdf');
  });
});
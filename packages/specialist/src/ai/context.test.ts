import { describe, expect, it } from '@jest/globals';
import { Context, makePrompt, Prompt } from './context.js';
import { Attachment } from './attachments.js';
import { modelFromString } from './models.js';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Context with attachments', () => {
  // Create a mock attachment
  const mockImageAttachment: Attachment = {
    filename: 'test-image.png',
    mimeType: 'image/png',
    base64Data: 'dGVzdGltYWdlZGF0YQ==' // Base64 for "testimagedata"
  };
  
  const mockPdfAttachment: Attachment = {
    filename: 'test-document.pdf',
    mimeType: 'application/pdf',
    base64Data: 'dGVzdHBkZmRhdGE=' // Base64 for "testpdfdata"
  };
  
  // Create a basic prompt for testing
  const testPrompt: Prompt = {
    name: 'test',
    system: 'You are a test assistant',
    model: modelFromString('ollama/llama3.2'),
    prepopulated_questions: [],
    tools: undefined
  };
  
  it('should add an image attachment to context', async () => {
    const context = new Context(testPrompt);
    
    // Initial context should have just the system message
    const initialMessages = context.getMessages();
    expect(initialMessages.length).toBe(1);
    expect(initialMessages[0].role).toBe('system');
    
    // Add an image attachment
    const updatedContext = await context.addAttachment(mockImageAttachment);
    
    // Context should now have the system message plus a user message with the attachment
    const updatedMessages = updatedContext.getMessages();
    expect(updatedMessages.length).toBe(2);
    expect(updatedMessages[1].role).toBe('user');
    
    // The user message should have content with both text and the image
    const content = updatedMessages[1].content as any[];
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBe(2);
    
    // First item should be text
    expect(content[0].type).toBe('text');
    expect(content[0].text).toContain(mockImageAttachment.filename);
    
    // Second item should be the image
    expect(content[1].type).toBe('image');
    expect(content[1].image).toBe(mockImageAttachment.base64Data);
    expect(content[1].mimeType).toBe(mockImageAttachment.mimeType);
  });
  
  it('should add a PDF attachment to context', async () => {
    const context = new Context(testPrompt);
    
    // Initial context should have just the system message
    const initialMessages = context.getMessages();
    expect(initialMessages.length).toBe(1);
    
    // Add a PDF attachment
    const updatedContext = await context.addAttachment(mockPdfAttachment);
    
    // Context should now have the system message plus a user message with the attachment
    const updatedMessages = updatedContext.getMessages();
    expect(updatedMessages.length).toBe(2);
    
    // The user message should have content with both text and the PDF
    const content = updatedMessages[1].content as any[];
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBe(2);
    
    // First item should be text
    expect(content[0].type).toBe('text');
    expect(content[0].text).toContain(mockPdfAttachment.filename);
    
    // Second item should be the PDF file
    expect(content[1].type).toBe('file');
    expect(content[1].data).toBe(mockPdfAttachment.base64Data);
    expect(content[1].mimeType).toBe(mockPdfAttachment.mimeType);
  });
  
  it('should not mutate the original context when adding an attachment', async () => {
    const originalContext = new Context(testPrompt);
    const messagesBeforeLength = originalContext.getMessages().length;
    
    // Add an attachment
    const updatedContext = await originalContext.addAttachment(mockImageAttachment);
    
    // Original context should be unchanged
    expect(originalContext.getMessages().length).toBe(messagesBeforeLength);
    expect(originalContext).not.toBe(updatedContext);
  });
});
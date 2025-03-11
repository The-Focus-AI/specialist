import { describe, expect, it } from '@jest/globals';
import { createAttachment, attachmentToContent, Attachment } from './attachments.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Attachments', () => {
  const imageFilePath = path.resolve(__dirname, '../../test_data/internet_archive_fffound.png');
  const pdfFilePath = path.resolve(__dirname, '../../test_data/Home-Cooked Software and Barefoot Developers.pdf');
  
  it('should create an attachment from a PNG image file', async () => {
    // Verify the test file exists
    expect(await fs.pathExists(imageFilePath)).toBe(true);
    
    const attachment = await createAttachment(imageFilePath);
    
    expect(attachment).toBeDefined();
    expect(attachment.filename).toBe('internet_archive_fffound.png');
    expect(attachment.mimeType).toBe('image/png');
    expect(attachment.base64Data).toBeDefined();
    expect(typeof attachment.base64Data).toBe('string');
    expect(attachment.base64Data.length).toBeGreaterThan(0);
  });
  
  it('should create an attachment from a PDF file', async () => {
    // Verify the test file exists
    expect(await fs.pathExists(pdfFilePath)).toBe(true);
    
    const attachment = await createAttachment(pdfFilePath);
    
    expect(attachment).toBeDefined();
    expect(attachment.filename).toBe('Home-Cooked Software and Barefoot Developers.pdf');
    expect(attachment.mimeType).toBe('application/pdf');
    expect(attachment.base64Data).toBeDefined();
    expect(typeof attachment.base64Data).toBe('string');
    expect(attachment.base64Data.length).toBeGreaterThan(0);
  });
  
  it('should convert an image attachment to content format', () => {
    const imageAttachment: Attachment = {
      filename: 'test.png',
      mimeType: 'image/png',
      base64Data: 'dGVzdGRhdGE=' // Base64 for "testdata"
    };
    
    const content = attachmentToContent(imageAttachment);
    
    expect(content).toEqual({
      type: 'image',
      image: 'dGVzdGRhdGE=',
      mimeType: 'image/png'
    });
  });
  
  it('should convert a PDF attachment to content format', () => {
    const pdfAttachment: Attachment = {
      filename: 'test.pdf',
      mimeType: 'application/pdf',
      base64Data: 'dGVzdGRhdGE=' // Base64 for "testdata"
    };
    
    const content = attachmentToContent(pdfAttachment);
    
    expect(content).toEqual({
      type: 'file',
      data: 'dGVzdGRhdGE=',
      mimeType: 'application/pdf'
    });
  });
  
  it('should throw an error for unsupported file types', () => {
    const textAttachment: Attachment = {
      filename: 'test.txt',
      mimeType: 'text/plain',
      base64Data: 'dGVzdGRhdGE='
    };
    
    expect(() => attachmentToContent(textAttachment)).toThrow('Unsupported file type: text/plain');
  });
});
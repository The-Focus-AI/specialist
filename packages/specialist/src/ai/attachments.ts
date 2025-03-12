import fs from "fs-extra";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import { FilePart, ImagePart } from "ai";

export interface Attachment {
  filename: string;
  mimeType: string;
  base64Data: string;
}

export async function createAttachment(filePath: string): Promise<Attachment> {
  const filename = path.basename(filePath);
  console.log("Creating attachment for", filePath);
  const fileBuffer = await fs.readFile(path.resolve(filePath));

  // Detect file type
  const fileType = await fileTypeFromBuffer(fileBuffer);
  const mimeType = fileType?.mime || "application/octet-stream";

  // Convert to base64
  const base64Data = fileBuffer.toString("base64");

  return {
    filename,
    mimeType,
    base64Data,
  };
}

export function attachmentToContent(
  attachment: Attachment
): ImagePart | FilePart {
  const isPdf = attachment.mimeType === "application/pdf";
  const isImage = attachment.mimeType.startsWith("image/");

  if (!isPdf && !isImage) {
    throw new Error(`Unsupported file type: ${attachment.mimeType}`);
  }

  if (isImage) {
    return {
      type: "image",
      image: attachment.base64Data,
      mimeType: attachment.mimeType,
    } as ImagePart;
  } else {
    return {
      type: "file",
      data: attachment.base64Data,
      mimeType: attachment.mimeType,
    } as FilePart;
  }
}

import sharp from "sharp";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_WIDTH = 2000;
const QUALITY = 80;

export interface UploadFileResult {
  url: string;
}

export interface UploadFileError {
  status: number;
  error: string;
}

export async function uploadFile(file: File): Promise<UploadFileResult | UploadFileError> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      status: 400,
      error: "Invalid file type. Only JPG, PNG, and WebP are allowed.",
    };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      status: 400,
      error: "File size exceeds 10MB limit.",
    };
  }

  // Read file buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Generate unique filename
  const filename = `${randomUUID()}.webp`;
  const uploadsDir = join(process.cwd(), "public", "uploads");

  // Ensure uploads directory exists
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  const filepath = join(uploadsDir, filename);

  // Process image: convert to WebP, resize if needed, compress
  const processedImage = await sharp(buffer)
    .resize(MAX_WIDTH, null, {
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: QUALITY })
    .toBuffer();

  // Save to disk
  await writeFile(filepath, processedImage);

  // Return public URL
  const url = `/uploads/${filename}`;

  return { url };
}


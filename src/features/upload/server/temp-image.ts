import sharp from "sharp";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getTempFilePath, generateImageFilename, ensureDir } from "@/lib/utils/image-utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_WIDTH = 2000;
const QUALITY = 80;

export interface TempImageResult {
  id: string;
  url: string;
  filename: string;
  isMain: boolean;
  temp: boolean;
}

export interface TempImageError {
  status: number;
  error: string;
}

export async function uploadTempImage(files: File[]): Promise<TempImageResult[] | TempImageError> {
  if (files.length === 0) {
    return {
      status: 400,
      error: "No files provided",
    };
  }

  const tempDir = join(process.cwd(), "public", "temp");
  await ensureDir(tempDir);

  const uploadPromises = files.map(async (file) => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Invalid file type for ${file.name}. Only JPG, PNG, and WebP are allowed.`);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File ${file.name} exceeds 10MB limit.`);
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const filename = generateImageFilename();
    const filepath = getTempFilePath(filename);

    // Process image: convert to WebP, resize if needed, compress
    const processedImage = await sharp(buffer)
      .resize(MAX_WIDTH, null, {
        withoutEnlargement: true,
        fit: "inside",
      })
      .webp({ quality: QUALITY })
      .toBuffer();

    // Save to temp directory
    await writeFile(filepath, processedImage);

    // Return temp URL (for preview) and filename (for later commit)
    const tempUrl = `/temp/${filename}`;
    const id = randomUUID();

    return {
      id,
      url: tempUrl,
      filename,
      isMain: false,
      temp: true,
    };
  });

  try {
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
    return {
      status: 500,
      error: errorMessage,
    };
  }
}


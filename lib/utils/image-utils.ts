// lib/utils/image-utils.ts
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { randomUUID } from "crypto";

export interface ImageFile {
  id: string;
  url: string;
  isMain: boolean;
  temp: boolean;
  filename?: string;
}

/**
 * Generate image path for a product
 */
export function generateImagePath(productId: string, filename: string): string {
  return `/uploads/products/${productId}/${filename}`;
}

/**
 * Get temp file path
 */
export function getTempFilePath(filename: string): string {
  return join(process.cwd(), "public", "temp", filename);
}

/**
 * Get product image directory path
 */
export function getProductImageDir(productId: string): string {
  return join(process.cwd(), "public", "uploads", "products", productId);
}

/**
 * Ensure directory exists
 */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Generate unique filename (always WebP)
 */
export function generateImageFilename(): string {
  return `${randomUUID()}.webp`;
}


// Server-only filesystem path helpers (avoid Turbopack broad pattern warnings in App Routes).
import { resolve } from "path";

export function getPublicDir(): string {
  return resolve(process.cwd(), "public");
}

export function getTempDir(): string {
  return resolve(process.cwd(), "public", "temp");
}

export function getUploadsProductsDir(): string {
  return resolve(process.cwd(), "public", "uploads", "products");
}

export function getTempFilePath(filename: string): string {
  return resolve(process.cwd(), "public", "temp", filename);
}

export function getProductUploadDir(productId: string): string {
  return resolve(process.cwd(), "public", "uploads", "products", productId);
}

export function getProductUploadFilePath(
  productId: string,
  filename: string
): string {
  return resolve(
    process.cwd(),
    "public",
    "uploads",
    "products",
    productId,
    filename
  );
}

// src/features/upload/server/cleanup-temp-files.ts
import { readdir, stat, unlink } from "fs/promises";
import { join } from "path";
import { getTempFilePath } from "@/lib/utils/image-utils";

export interface CleanupTempFilesResult {
  ok: true;
  scanned: number;
  deleted: number;
  failed: number;
  deletedFiles: string[]; // filenames only
  failedFiles: string[]; // filenames only
}

export interface CleanupTempFilesError {
  ok: false;
  error: string;
}

/**
 * Cleanup old temp files older than specified hours.
 * Only operates on files in public/temp/ directory.
 * @param params - Optional parameters
 * @returns Result with counts and filenames (not absolute paths)
 */
export async function cleanupOldTempFiles(
  params?: { olderThanHours?: number }
): Promise<CleanupTempFilesResult | CleanupTempFilesError> {
  const olderThanHours = params?.olderThanHours ?? 24;
  const olderThanMs = olderThanHours * 60 * 60 * 1000;
  const now = Date.now();

  const tempDir = join(process.cwd(), "public", "temp");

  try {
    // Read directory
    const files = await readdir(tempDir);

    // Filter to only files (not directories or .gitkeep)
    const fileStats = await Promise.all(
      files
        .filter((file) => file !== ".gitkeep")
        .map(async (filename) => {
          const filePath = getTempFilePath(filename);
          try {
            const stats = await stat(filePath);
            return { filename, stats, filePath };
          } catch {
            // File doesn't exist or can't stat, skip
            return null;
          }
        })
    );

    const validFiles = fileStats
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => item.stats.isFile());

    const deletedFiles: string[] = [];
    const failedFiles: string[] = [];

    // Delete files older than threshold
    for (const item of validFiles) {
      const { filename, stats, filePath } = item;
      const fileAge = now - stats.mtimeMs;

      if (fileAge > olderThanMs) {
        try {
          await unlink(filePath);
          deletedFiles.push(filename);
        } catch {
          // Failed to delete, but continue with others
          failedFiles.push(filename);
        }
      }
    }

    return {
      ok: true,
      scanned: validFiles.length,
      deleted: deletedFiles.length,
      failed: failedFiles.length,
      deletedFiles,
      failedFiles,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      ok: false,
      error: `Failed to cleanup temp files: ${errorMessage}`,
    };
  }
}

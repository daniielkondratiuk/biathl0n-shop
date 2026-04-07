import { unlink } from "fs/promises";
import { existsSync } from "fs";
import { getTempFilePath } from "@/lib/utils/image-utils";

export interface DeleteTempFileError {
  status: number;
  error: string;
}

export async function deleteTempFile(filename: string): Promise<{ success: true } | DeleteTempFileError> {
  const filePath = getTempFilePath(filename);

  if (!existsSync(filePath)) {
    return {
      status: 404,
      error: "File not found",
    };
  }

  await unlink(filePath);

  return { success: true };
}


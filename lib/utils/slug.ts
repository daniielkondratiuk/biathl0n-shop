// lib/utils/slug.ts

/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug by appending a numeric suffix (-2, -3, …) if needed.
 *
 * @param baseSlug  - The desired slug (already slugified).
 * @param checkExists - An async callback that returns `true` when a product
 *                      with the given slug already exists in the DB.
 *                      The caller provides the Prisma query so this helper
 *                      stays client-safe (no server imports).
 */
export async function makeUniqueSlug(
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await checkExists(baseSlug))) return baseSlug;

  let suffix = 2;
  while (suffix <= 100) {
    const candidate = `${baseSlug}-${suffix}`;
    if (!(await checkExists(candidate))) return candidate;
    suffix++;
  }

  throw new Error(
    `Could not generate unique slug for "${baseSlug}" after 100 attempts`,
  );
}


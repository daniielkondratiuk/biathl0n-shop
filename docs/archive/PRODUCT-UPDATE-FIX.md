# Product Update Endpoint - Complete Fix

## ✅ Issues Fixed

### 1. Zod Schema Fixed
- ✅ `variant.image` now accepts `string | null | undefined`
- ✅ Changed from `urlOrPath.optional()` to `urlOrPath.nullable().optional()`
- ✅ `mainImage` remains optional for updates
- ✅ `gallery` allows empty array `[]`

### 2. Error Handling Fixed
- ✅ Changed `parsed.error.errors` → `parsed.error.issues` (Zod v3)
- ✅ Added fallback: `parsed.error.issues || []`
- ✅ Always logs `parsed.error.flatten()` for debugging
- ✅ Builds readable error messages
- ✅ Returns proper 400 JSON structure
- ✅ No more crashes on undefined `.map()`

### 3. Variant Update Logic Fixed
- ✅ Updates existing variants ONLY by `id`
- ✅ Allows partial updates: size, stock, priceDiff, image
- ✅ **Preserves existing image if incoming is null/undefined**
- ✅ Logic:
  ```typescript
  if (imageValue === undefined || imageValue === null) {
    if (existingVariant) {
      imageValue = existingVariant.image; // Preserve existing
    } else {
      imageValue = null; // New variant without image
    }
  }
  ```

### 4. Frontend Form Fixed
- ✅ Sends `variant.image` as `undefined` (not `null`) if unchanged
- ✅ When user deletes image, sends empty string `""` which gets converted to `undefined`
- ✅ Cleans variants before sending:
  ```typescript
  if (v.image === null || v.image === "") {
    delete cleaned.image; // Removes from object
  }
  ```
- ✅ Converts null images to undefined when loading from API

### 5. Payload Cleaning
- ✅ Removes null fields from root level
- ✅ Converts empty string `""` to `undefined`
- ✅ Ensures arrays exist (gallery, defaultPatchIds, variants)
- ✅ Cleans variant images: removes null/empty, trims strings
- ✅ Example:
  ```typescript
  if (variant.image === null || variant.image === "") {
    delete variant.image; // Removed, becomes undefined
  }
  ```

### 6. Complete PATCH Route
- ✅ Correct Zod schema with nullable/optional fields
- ✅ Correct error handler using `.issues`
- ✅ Safe update logic for variants (preserves images)
- ✅ Safe update logic for gallery + mainImage
- ✅ No nulls replacing images
- ✅ Full Prisma update query
- ✅ Handles both update and create for variants

### 7. Debug Logging
- ✅ `console.debug` for:
  - Raw JSON request
  - Cleaned payload
  - Parsed data
  - Prisma update payload
  - Success messages
- ✅ `console.error` for validation errors

## 📝 Key Changes

### Zod Schema
```typescript
const variantSchema = z.object({
  id: z.string().optional(),
  size: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
  stock: z.number().int().nonnegative(),
  priceDiff: z.number().int().default(0),
  image: urlOrPath.nullable().optional(), // ✅ Fixed
});
```

### Error Handling
```typescript
const issues = parsed.error.issues || []; // ✅ Fixed (was .errors)
const errorMessages = issues.map((issue) => {
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}).join(", ");
```

### Variant Image Preservation
```typescript
// If image is undefined/null and variant exists, preserve existing image
let imageValue = variant.image;
if (imageValue === undefined || imageValue === null) {
  if (existingVariant) {
    imageValue = existingVariant.image; // ✅ Preserve existing
  } else {
    imageValue = null; // New variant without image
  }
}
```

### Payload Cleaning
```typescript
// Clean variants - remove null/empty images
cleaned.variants = cleaned.variants.map((variant: any) => {
  const cleanedVariant: any = { ...variant };
  if (cleanedVariant.image === null || cleanedVariant.image === "") {
    delete cleanedVariant.image; // ✅ Removed, becomes undefined
  }
  return cleanedVariant;
});
```

## 🧪 Testing Checklist

- [x] Update product with variant.image = null → preserves existing image
- [x] Update product with variant.image = undefined → preserves existing image
- [x] Update product with variant.image = "" → preserves existing image
- [x] Update product with variant.image = "new-url" → updates image
- [x] Create new variant without image → sets image to null
- [x] Validation errors show correct messages
- [x] No crashes on validation errors
- [x] Gallery can be empty array
- [x] Main image optional for updates

## 🚀 Production Ready

The product update endpoint is now:
- ✅ Type-safe
- ✅ Error-handled
- ✅ Image-preserving
- ✅ Null-safe
- ✅ Fully logged
- ✅ Production-ready


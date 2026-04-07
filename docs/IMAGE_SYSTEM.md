# Image System Documentation

## Overview

The image upload system handles product images with role-based organization (MAIN, MAIN_DETAIL, GALLERY) and a two-phase upload flow (temp → commit).

## Upload Flow

### Two-Phase Upload Process

1. **Temp Upload** (`POST /api/upload/temp-image`)
   - Images uploaded to `/public/temp/`
   - UUID-based filenames (no collisions)
   - Not committed until product is saved

2. **Commit** (`POST /api/upload/commit`)
   - Moves temp files to product directory
   - Final path: `/public/uploads/products/{productId}/{uuid}.webp`
   - Updates product with final image paths

### File Storage Structure
```
public/
  ├── temp/                    # Temporary uploads (deleted after commit)
  │   └── .gitkeep
  └── uploads/
      └── products/
          └── {productId}/     # Final product images
              └── {uuid}.webp
```

## Image Roles

### Role Types
- **MAIN**: Required, shown in product cards and as primary image
- **MAIN_DETAIL**: Optional, shown on hover in product cards (requires MAIN to exist)
- **GALLERY**: Multiple allowed, shown in product detail gallery

### Role Rules
- Each color variant must have at least one MAIN image
- MAIN_DETAIL can only be set if MAIN exists
- GALLERY images are optional and multiple
- Images are organized per color variant

## Admin UI Behavior

### Product Creation
1. User uploads images → stored in `/public/temp/`
2. User creates product → product saved to DB
3. On success → commit images from temp to `/public/uploads/products/{productId}/`
4. Update product with final image paths

### Product Editing
1. Load existing images from product
2. User can add new images (stored in temp) or delete existing
3. On save → commit new temp images
4. Update product with combined image arrays

### Product Deletion
- Automatically deletes all images in `/public/uploads/products/{productId}/`
- Temp files cleaned up on errors

## API Endpoints

### `POST /api/upload/temp-image`
- Upload to temp storage
- Accepts: `multipart/form-data`
- Returns: `{ url: "/temp/{uuid}.webp" }`
- Max size: 10MB
- Allowed types: jpg, jpeg, png, webp
- Output: WebP format, max 2000px width, quality 80

### `POST /api/upload/commit`
- Move temp files to product directory
- Body: `{ productId: string, tempUrls: string[] }`
- Returns: `{ urls: string[] }` (final paths)

### `DELETE /api/upload/temp/[filename]`
- Delete temp file
- Used for cleanup

### `DELETE /api/products/[id]/images`
- Delete product image
- Removes file from filesystem
- Updates product record

## Image Processing

### Automatic Processing
- **WebP Conversion**: All images converted to WebP format
- **Compression**: Using Sharp library
- **Max Width**: 2000px (auto-resized)
- **Quality**: ~80 (optimized for web)

### Utilities
- `lib/utils/image-utils.ts` - Image path generation, directory management
- `lib/utils/product-image-cleanup.ts` - Product image deletion

## Components

### ProductImageUploader
- Drag-and-drop component
- Multi-image upload
- Preview thumbnails
- Delete buttons (works for both temp and existing)
- Main image selector (star icon)
- Upload progress indicators
- Role selection (MAIN, MAIN_DETAIL, GALLERY)

### Usage
```tsx
<ProductImageUploader
  value={images}
  onChange={setImages}
  disabled={saving}
  productId={productId}
/>
```

## Error Handling

- Validation errors shown in UI
- Upload failures handled gracefully
- Temp files cleaned up on errors
- Detailed console logging for debugging

## Cleanup Behavior

- Temp files deleted after successful commit
- Product images deleted when product is deleted
- Orphaned temp files can be cleaned up manually
- `.gitkeep` preserves directory structure


# Product System Documentation

## Overview

The product system manages products with color variants, size variants, and patches. Products are organized hierarchically: Product → Color Variants → Size Variants, with patches as optional add-ons.

## Data Model

### Product Model
- `title` (String, required) - Product title
- `slug` (String, unique) - URL-friendly identifier
- `description` (String, optional) - Product description
- `basePrice` (Int, required, default: 0) - Base price in cents
- `categoryId` (String, relation to Category)
- `gender` (Gender enum: MEN | WOMEN | KIDS | UNISEX, optional)
- `badge` (ProductBadge enum: NEW | BESTSELLER | SALE | LIMITED | BACKINSTOCK | TRENDING, optional)
- `isActive` (Boolean, default: true)
- `defaultPatchIds` (String[], default: []) - Default patches for product

### Color Variant Architecture
```
Product
  └── colorVariants (ProductColorVariant[])
       ├── color (Color)
       ├── images (ProductImage[])
       │    ├── role: MAIN (required)
       │    ├── role: MAIN_DETAIL (optional, requires MAIN)
       │    └── role: GALLERY (multiple)
       └── sizes (ProductSizeVariant[])
            ├── size: XS | S | M | L | XL | XXL
            ├── stock
            ├── priceDiff
            └── sku: {productSlug}-{colorSlug}-{size}
```

### Important Rules

1. **Size Variants Not Deleted**: Size variants are never deleted due to `OrderItem` foreign key constraints. Instead:
   - Set `stock = 0` to mark as out of stock
   - Set `isActive = false` on the color variant to hide it
   - Use soft deletes for inventory management

2. **SKU Generation**: Format is `{productSlug}-{colorSlug}-{size}` (uppercase)
   - Example: `ufo-t-shirt-red-xl` → `UFO-T-SHIRT-RED-XL`
   - SKUs must be unique across all products

3. **Image Roles**:
   - `MAIN`: Required, shown in product cards and as primary image
   - `MAIN_DETAIL`: Optional, shown on hover in product cards (requires MAIN)
   - `GALLERY`: Multiple allowed, shown in product detail gallery

4. **Price Calculation**: `basePrice + colorVariant.priceDiff + sizeVariant.priceDiff + sum(patchPrices)`

## API Endpoints

### Public Endpoints
- `GET /api/products` - List products (with filters)
- `GET /api/products/[id]` - Get product details
- `GET /api/categories` - List categories

### Admin Endpoints
- `POST /api/products` - Create product
- `PATCH /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product (cascades to variants)
- `GET /api/products/[id]` - Get product with all relations

## Admin UI

### Product List (`/admin/products`)
- Table with: Image, Title, Price, Gender, Badge, Stock, Status, Actions
- Filters: Category, Gender, Badge, Active/Inactive
- Stock calculated from all size variants

### Product Creation (`/admin/products/new`)
- **Basic Info**: Title, slug, description, basePrice, category, gender, badge, isActive
- **Color Variants**: Add/remove color variants with:
  - Color selection
  - Image uploads (MAIN, MAIN_DETAIL, GALLERY roles)
  - Size variants per color (stock, priceDiff, auto-generated SKU)
- **Default Patches**: Multi-select with previews

### Product Edit (`/admin/products/[id]`)
- Pre-populated form with existing data
- Add/update/remove color variants
- Update images and roles
- Manage size variants per color
- Delete product (with cascade)

## Storefront

### Product Page (`/product/[slug]`)
- Color swatch selection
- Dynamic image updates based on selected color
- Size selection per color (with stock indicators)
- Patch selection (multi-select with prices)
- Real-time price calculation
- Add to cart (requires size selection)

### Product Card
- Shows MAIN image from first color variant
- Hover shows MAIN_DETAIL if available
- Displays badge if present
- Shows color count

## Operational Notes

### SKU Generation
- Automatic generation on product creation/update
- Format: `{productSlug}-{colorSlug}-{size}`
- Ensures uniqueness across all products

### Image Management
- Images stored per color variant
- Roles enforced: MAIN required, MAIN_DETAIL optional
- Upload via drag-and-drop or URL
- WebP conversion and compression

### Validation
- At least one color variant required on creation
- PATCH allows empty colorVariants array (to delete all)
- PATCH allows undefined colorVariants (don't update)
- Size variants validated per color variant

### Cart Integration
- Cart items store: `productId`, `sizeVariantId`, `selectedPatchIds`, `finalPrice`
- Price calculated at add-to-cart time
- Final price includes: basePrice + colorPriceDiff + sizePriceDiff + patchPrices

## Migration Notes

When migrating existing products:
1. Set `title = name` for existing products
2. Set `basePrice = price` for existing products
3. Set `isActive = visible` for existing products
4. Generate color variants from existing variant data
5. Generate SKUs for all size variants


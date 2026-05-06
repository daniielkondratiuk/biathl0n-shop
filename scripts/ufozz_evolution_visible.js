const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const inboxRoot = "/srv/ufozz-inbox/biathl0n/evolution";
const detailRoot = path.join(inboxRoot, "detail");
const publicRoot = "/var/www/biathl0n-shop/public/uploads/products";
const title = "The Ultimate Upgrade";
const frTitle = "La mise à niveau ultime";
const designSlug = "the-ultimate-upgrade";
const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
const colorOrder = ["black", "gray", "white", "red", "blue", "brown", "yellow"];
const sourceForSiteColor = { black: "black", gray: "gray", white: "white", red: "red", blue: "blue", brown: "brown", yellow: "yellow" };
const defs = [
  { folder: "women_t_shirt", productName: "women-t-shirt", mainToken: "women_shirt", price: 3500, cat: { name: "Women's T-shirts", slug: "women-t-shirt" }, gender: "WOMEN" },
  { folder: "t_shirt", productName: "t-shirt", mainToken: "shirt", price: 3500, cat: { name: "T-shirts", slug: "t-shirt" }, gender: "MEN" },
  { folder: "sweat", productName: "sweatshirt", mainToken: "sweat", price: 4500, cat: { name: "Sweatshirts", slug: "sweatshirt" }, gender: "UNISEX" },
  { folder: "joggers", productName: "joggers", mainToken: "joggers", price: 4500, cat: { name: "Joggers", slug: "jogger" }, gender: "UNISEX" },
  { folder: "hoodie", productName: "hoodie", mainToken: "hoodie", price: 6500, cat: { name: "Hoodies", slug: "hoodie" }, gender: "UNISEX" },
  { folder: "cap", productName: "cap", mainToken: "cap", price: 3500, cat: { name: "Caps", slug: "cap" }, gender: "UNISEX" },
  { folder: "beanie", productName: "beanie", mainToken: "beanie", price: 3500, cat: { name: "Beanies", slug: "beanies" }, gender: "UNISEX" },
];
const enDescription = `This design reimagines millions of years of natural selection as one long warm-up for the winter season. It suggests that the entire point of standing upright wasn't just to reach for higher fruit, but to eventually master the perfect shooting stance. From the first primitive steps to the final bullseye, this is a humorous look at how evolution’s true "final form" comes equipped with skis and a very steady hand.`;
const frDescription = `Ce design réinvente des millions d’années de sélection naturelle comme un long échauffement avant la saison hivernale. Il suggère que le véritable but de la posture debout n’était pas seulement d’atteindre des fruits plus hauts, mais de finir par maîtriser la position de tir parfaite. Des premiers pas primitifs jusqu’au dernier plein centre, c’est un regard humoristique sur la façon dont la véritable « forme finale » de l’évolution arrive équipée de skis et d’une main parfaitement stable.`;
function sku(slug, color, size) { return `${slug}-${color}-${size.toLowerCase()}`; }
async function clearProduct(tx, slug) { const p = await tx.product.findUnique({ where: { slug }, select: { id: true } }); if (p) await tx.product.delete({ where: { id: p.id } }); return p?.id; }
function requireFile(filePath, label) { if (!fs.existsSync(filePath)) throw new Error(`Missing ${label}: ${filePath}`); }

(async () => {
  requireFile(inboxRoot, "evolution inbox folder");
  requireFile(detailRoot, "detail folder");
  const colors = await prisma.color.findMany();
  const colorBySlug = Object.fromEntries(colors.map((c) => [c.slug, c]));
  for (const color of colorOrder) if (!colorBySlug[color]) throw new Error(`Missing color ${color}`);
  const out = [];
  await prisma.$transaction(async (tx) => {
    for (const def of defs) {
      const slug = `${designSlug}-${def.productName}`;
      const oldId = await clearProduct(tx, slug);
      if (oldId) fs.rmSync(path.join(publicRoot, oldId), { recursive: true, force: true });
      const category = await tx.category.upsert({ where: { slug: def.cat.slug }, update: { name: def.cat.name }, create: def.cat });
      const product = await tx.product.create({ data: { name: title, title, slug, description: enDescription, basePrice: def.price, price: def.price, stock: colorOrder.length * sizes.length * 5, visible: true, isActive: true, showInHero: false, categoryId: category.id, gender: def.gender, badge: null, defaultPatchIds: [] } });
      const destDir = path.join(publicRoot, product.id);
      fs.mkdirSync(destDir, { recursive: true });
      for (let sortOrder = 0; sortOrder < colorOrder.length; sortOrder += 1) {
        const siteColor = colorOrder[sortOrder];
        const sourceColor = sourceForSiteColor[siteColor];
        const folder = path.join(inboxRoot, def.folder);
        requireFile(folder, def.folder);
        const variant = await tx.productColorVariant.create({ data: { productId: product.id, colorId: colorBySlug[siteColor].id, sortOrder, priceDiff: 0, isActive: true } });
        await tx.productSizeVariant.createMany({ data: sizes.map((size) => ({ colorVariantId: variant.id, size, stock: 5, stockReserved: 0, priceDiff: 0, sku: sku(slug, siteColor, size) })) });
        const all = fs.readdirSync(folder).filter((f) => f.toLowerCase().endsWith(".png") && f.startsWith(`${sourceColor}_`));
        const main = `${sourceColor}_${def.mainToken}.png`;
        const detail = `${sourceColor}_detail.png`;
        requireFile(path.join(folder, main), `${def.folder}/${main}`);
        requireFile(path.join(detailRoot, detail), `detail/${detail}`);
        const ordered = [
          { file: main, src: path.join(folder, main), role: "MAIN" },
          { file: detail, src: path.join(detailRoot, detail), role: "MAIN_DETAIL" },
          ...all.filter((f) => f !== main).sort().map((f) => ({ file: f, src: path.join(folder, f), role: "GALLERY" })),
        ];
        await tx.productImage.createMany({ data: ordered.map((img, i) => { fs.copyFileSync(img.src, path.join(destDir, img.file)); return { colorVariantId: variant.id, url: `/uploads/products/${product.id}/${img.file}`, role: img.role, order: i < 2 ? 0 : i - 2 }; }) });
      }
      await tx.productTranslation.createMany({ data: [{ productId: product.id, locale: "en", title, description: enDescription }, { productId: product.id, locale: "fr", title: frTitle, description: frDescription }] });
      out.push({ slug, id: product.id, price: def.price / 100 });
    }
  }, { timeout: 120000 });
  console.log(JSON.stringify({ ok: true, count: out.length, products: out }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const inboxRoot = "/srv/ufozz-inbox/biathl0n/Biathlete Emblem";
const detailRoot = path.join(inboxRoot, "detail");
const publicRoot = "/var/www/biathl0n-shop/public/uploads/products";
const title = "Biathlete Emblem";
const designSlug = "biathlete-emblem";
const sizes = ["XS","S","M","L","XL","XXL"];
const colorOrder = ["black", "gray", "white", "red", "blue", "brown", "orange"];
const sourceForSiteColor = { black:"black", gray:"gray", white:"white", red:"red", blue:"blue", brown:"brown", orange:"yellow" };
const defs = [
 {folder:"women_t_shirt", productName:"women-t-shirt", mainToken:"women_shirt", price:3500, cat:{name:"Women's T-shirts", slug:"women-t-shirt"}, gender:"WOMEN"},
 {folder:"t_shirt", productName:"t-shirt", mainToken:"shirt", price:3500, cat:{name:"T-shirts", slug:"t-shirt"}, gender:"MEN"},
 {folder:"sweat", productName:"sweatshirt", mainToken:"sweat", price:4500, cat:{name:"Sweatshirts", slug:"sweatshirt"}, gender:"UNISEX"},
 {folder:"joggers", productName:"joggers", mainToken:"joggers", price:4500, cat:{name:"Joggers", slug:"jogger"}, gender:"UNISEX"},
 {folder:"hoodie", productName:"hoodie", mainToken:"hoodie", price:6500, cat:{name:"Hoodies", slug:"hoodie"}, gender:"UNISEX"},
 {folder:"cap", productName:"cap", mainToken:"cap", price:3500, cat:{name:"Caps", slug:"cap"}, gender:"UNISEX"},
 {folder:"beanie", productName:"beanie", mainToken:"beanie", price:3500, cat:{name:"Beanies", slug:"beanies"}, gender:"UNISEX"},
];
const enDescription = `A dense, central embroidery pattern featuring a detailed silhouette of a biathlete in dynamic motion. The athlete is shown from behind, in a skiing posture, actively pushing with two ski poles. Two skis are visible on the feet, positioned for cross-country movement. Positioned directly below this figure is the embroidered text 'BIATHLON' in a clean, bold, all-caps sans-serif font. Both the figure and the text are rendered with precise, solid thread work for a sharp, minimalist appearance.`;
const frDescription = `Un motif de broderie central et dense mettant en scène la silhouette détaillée d’un biathlète en plein mouvement. L’athlète est représenté de dos, en posture de ski, poussant activement sur deux bâtons. Deux skis sont visibles aux pieds, orientés pour le déplacement en ski de fond. Directement sous la silhouette apparaît le texte brodé 'BIATHLON', dans une police sans sérif propre, grasse et en capitales. La figure comme le texte sont réalisés avec un travail de fil précis et plein, pour un rendu net, minimaliste et affirmé.`;
function sku(slug, color, size){ return `${slug}-${color}-${size.toLowerCase()}`; }
async function clearProduct(tx, slug){ const p=await tx.product.findUnique({where:{slug}, select:{id:true}}); if(p) await tx.product.delete({where:{id:p.id}}); return p?.id; }
(async()=>{
 const colors = await prisma.color.findMany();
 const colorBySlug = Object.fromEntries(colors.map(c=>[c.slug,c]));
 for (const c of colorOrder) if (!colorBySlug[c]) throw new Error(`Missing color ${c}`);
 const out=[];
 await prisma.$transaction(async(tx)=>{
   for (const def of defs) {
     const slug = `${designSlug}-${def.productName}`;
     const oldId = await clearProduct(tx, slug);
     if (oldId) fs.rmSync(path.join(publicRoot, oldId), {recursive:true, force:true});
     const cat = await tx.category.upsert({where:{slug:def.cat.slug}, update:{name:def.cat.name}, create:def.cat});
     const p = await tx.product.create({data:{name:title,title,slug,description:enDescription,basePrice:def.price,price:def.price,stock:210,visible:true,isActive:true,showInHero:false,categoryId:cat.id,gender:def.gender,badge:null,defaultPatchIds:[]}});
     const destDir = path.join(publicRoot, p.id); fs.mkdirSync(destDir,{recursive:true});
     for (let sortOrder=0; sortOrder<colorOrder.length; sortOrder++) {
       const siteColor = colorOrder[sortOrder];
       const sourceColor = sourceForSiteColor[siteColor];
       const folder = path.join(inboxRoot, def.folder);
       const cv = await tx.productColorVariant.create({data:{productId:p.id,colorId:colorBySlug[siteColor].id,sortOrder,priceDiff:0,isActive:true}});
       await tx.productSizeVariant.createMany({data:sizes.map(size=>({colorVariantId:cv.id,size,stock:5,stockReserved:0,priceDiff:0,sku:sku(slug,siteColor,size)}))});
       const all = fs.readdirSync(folder).filter(f=>f.endsWith(".png") && f.startsWith(`${sourceColor}_`));
       const main = `${sourceColor}_${def.mainToken}.png`;
       const detail = `${sourceColor}_detail.png`;
       if (!fs.existsSync(path.join(folder, main))) throw new Error(`Missing ${def.folder}/${main}`);
       if (!fs.existsSync(path.join(detailRoot, detail))) throw new Error(`Missing detail/${detail}`);
       const ordered = [
         {file:main, src:path.join(folder, main), role:"MAIN"},
         {file:detail, src:path.join(detailRoot, detail), role:"MAIN_DETAIL"},
         ...all.filter(f=>f!==main).sort().map(f=>({file:f, src:path.join(folder, f), role:"GALLERY"}))
       ];
       await tx.productImage.createMany({data:ordered.map((img,i)=>{fs.copyFileSync(img.src, path.join(destDir,img.file)); return {colorVariantId:cv.id,url:`/uploads/products/${p.id}/${img.file}`,role:img.role,order:i<2?0:i-2};})});
     }
     await tx.productTranslation.createMany({data:[{productId:p.id,locale:"en",title,description:enDescription},{productId:p.id,locale:"fr",title,description:frDescription}]});
     out.push({slug,id:p.id,price:def.price/100});
   }
 }, {timeout:60000});
 console.log(JSON.stringify({ok:true,out},null,2));
})().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
